import { v } from 'convex/values'

import { mutation } from './_generated/server'
import { transitionSessionSafely } from '../lib/interview/session-machine'
import type { InterviewSessionState } from '../lib/interview/types'

function mapArtifactStatus(event: string, hasError: boolean) {
  if (hasError) {
    return 'failed' as const
  }

  if (event === 'egress_started') {
    return 'active' as const
  }

  if (event === 'egress_ended') {
    return 'complete' as const
  }

  return 'active' as const
}

function inferArtifactType(
  filename?: string,
  manifestLocation?: string
): 'audio' | 'video' | 'composite' | 'segments' {
  const normalized = `${filename ?? ''} ${manifestLocation ?? ''}`.toLowerCase()

  if (manifestLocation) {
    return 'segments'
  }

  if (/\.(ogg|mp3|wav|m4a)\b/.test(normalized)) {
    return 'audio'
  }

  if (/\.(mp4|mov|webm|mkv)\b/.test(normalized)) {
    return 'video'
  }

  return 'composite'
}

function buildArtifactKey(
  egressId: string,
  filename?: string,
  location?: string,
  manifestLocation?: string
) {
  return `${egressId}:${manifestLocation ?? location ?? filename ?? 'primary'}`
}

function toIsoFromEpochMs(value?: number) {
  if (!value) {
    return undefined
  }

  return new Date(value).toISOString()
}

export const ingestWebhookEvent = mutation({
  args: {
    event: v.string(),
    roomName: v.optional(v.string()),
    participantIdentity: v.optional(v.string()),
    participantName: v.optional(v.string()),
    egressId: v.optional(v.string()),
    artifactKey: v.optional(v.string()),
    filename: v.optional(v.string()),
    location: v.optional(v.string()),
    manifestLocation: v.optional(v.string()),
    startedAtMs: v.optional(v.number()),
    endedAtMs: v.optional(v.number()),
    updatedAtMs: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    sizeBytes: v.optional(v.number()),
    error: v.optional(v.string()),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.roomName) {
      return null
    }

    const session = await ctx.db
      .query('interviewSessions')
      .withIndex('by_room_name', (q) => q.eq('roomName', args.roomName))
      .first()

    if (!session) {
      return null
    }

    const now = new Date().toISOString()
    const detail =
      args.details ??
      (args.participantIdentity
        ? `${args.event} for ${args.participantIdentity}`
        : `${args.event} for ${args.roomName}`)

    await ctx.db.insert('sessionEvents', {
      sessionId: session._id,
      type: args.event,
      detail,
      createdAt: now,
    })

    if (
      args.event === 'participant_joined' &&
      !['processing', 'completed', 'failed'].includes(session.state)
    ) {
      const nextState = transitionSessionSafely(
        session.state as InterviewSessionState,
        'live'
      )
      await ctx.db.patch(session._id, {
        state: nextState,
        startedAt: session.startedAt ?? now,
      })
    }

    if (
      (args.event === 'participant_left' ||
        args.event === 'participant_connection_aborted') &&
      !['processing', 'completed', 'failed'].includes(session.state)
    ) {
      const nextState = transitionSessionSafely(
        session.state as InterviewSessionState,
        'interrupted'
      )
      await ctx.db.patch(session._id, {
        state: nextState,
      })
    }

    if (args.egressId) {
      const artifactType = inferArtifactType(
        args.filename,
        args.manifestLocation
      )
      const status = mapArtifactStatus(args.event, Boolean(args.error))
      const artifactKey =
        args.artifactKey ??
        buildArtifactKey(
          args.egressId,
          args.filename,
          args.location,
          args.manifestLocation
        )
      const existing = await ctx.db
        .query('recordingArtifacts')
        .withIndex('by_artifact_key', (q) => q.eq('artifactKey', artifactKey))
        .first()
      const artifactFields = {
        sessionId: session._id,
        provider: 'livekit' as const,
        egressId: args.egressId,
        artifactKey,
        roomName: args.roomName,
        artifactType,
        status,
        filename: args.filename,
        location: args.location,
        manifestLocation: args.manifestLocation,
        startedAt: toIsoFromEpochMs(args.startedAtMs),
        endedAt: toIsoFromEpochMs(args.endedAtMs),
        durationMs: args.durationMs,
        sizeBytes: args.sizeBytes,
        error: args.error,
        createdAt: now,
        updatedAt: toIsoFromEpochMs(args.updatedAtMs) ?? now,
      }

      if (!existing) {
        await ctx.db.insert('recordingArtifacts', artifactFields)
      } else {
        await ctx.db.patch(existing._id, {
          ...artifactFields,
          createdAt: existing.createdAt,
        })
      }
    }

    return {
      sessionId: session._id,
      roomName: session.roomName,
    }
  },
})
