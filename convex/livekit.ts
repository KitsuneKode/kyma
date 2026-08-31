import { v } from 'convex/values'

import { finalizeInterviewForProcessing } from './helpers/finalizeInterviewProcessing'
import { insertSessionEventWithTransition } from './helpers/interviewSession'
import { pipelineMutation } from './lib/pipelineFunctions'

type ArtifactStatus = 'starting' | 'active' | 'complete' | 'failed'

function mapArtifactStatus(event: string, hasError: boolean) {
  if (hasError) {
    return 'failed' as const
  }

  if (event === 'egress_ended') {
    return 'complete' as const
  }

  return 'active' as const
}

/**
 * Provider webhooks can be retried or arrive out of order. A late non-terminal
 * event must never move an artifact backwards after it has completed or failed.
 */
function resolveArtifactStatus(
  existing: ArtifactStatus | undefined,
  next: ArtifactStatus
): ArtifactStatus {
  if (
    (existing === 'complete' || existing === 'failed') &&
    (next === 'starting' || next === 'active')
  ) {
    return existing
  }

  return next
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

export const ingestWebhookEvent = pipelineMutation({
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

    // Artifact identity is stable across egress lifecycle events, but timeline
    // identity is not: `egress_started` and `egress_ended` must each be recorded
    // while both reconcile the same recording artifact.
    const artifactKey = args.egressId
      ? (args.artifactKey ??
        buildArtifactKey(
          args.egressId,
          args.filename,
          args.location,
          args.manifestLocation
        ))
      : undefined
    const dedupeKey = artifactKey
      ? `egress:${artifactKey}:${args.event}`
      : `${args.event}:${args.egressId ?? 'na'}:${args.participantIdentity ?? 'na'}`
    const existingEvent = await ctx.db
      .query('sessionEvents')
      .withIndex('by_session_and_dedupe_key', (q) =>
        q.eq('sessionId', session._id).eq('dedupeKey', dedupeKey)
      )
      .first()
    // Older deployments used the artifact key itself as the event dedupe key.
    // Recognise that shape for idempotency, but only for the same event so an
    // old `egress_started` row cannot suppress a later `egress_ended` row.
    const legacyArtifactEvent = artifactKey
      ? await ctx.db
          .query('sessionEvents')
          .withIndex('by_session_and_dedupe_key', (q) =>
            q.eq('sessionId', session._id).eq('dedupeKey', artifactKey)
          )
          .first()
      : null
    const matchingEvent =
      existingEvent ??
      (legacyArtifactEvent?.type === args.event ? legacyArtifactEvent : null)

    const isCandidateParticipant =
      args.participantIdentity?.startsWith('candidate-') ?? false

    // Route session-state-changing participant events through the shared
    // transition path so duration accounting, start timing, and ownership rules
    // run on every entry point (candidate, agent, webhook) - not just here.
    if (
      args.event === 'participant_joined' &&
      !['processing', 'completed', 'failed'].includes(session.state)
    ) {
      await insertSessionEventWithTransition(ctx, {
        session,
        sessionId: session._id,
        type: args.event,
        detail,
        source: 'livekit-webhook',
        dedupeKey,
        state: 'live',
      })
      return { sessionId: session._id, roomName: session.roomName }
    }

    if (
      (args.event === 'participant_left' ||
        args.event === 'participant_connection_aborted') &&
      !['processing', 'completed', 'failed', 'reconnecting'].includes(
        session.state
      ) &&
      isCandidateParticipant
    ) {
      await insertSessionEventWithTransition(ctx, {
        session,
        sessionId: session._id,
        type: args.event,
        detail,
        source: 'livekit-webhook',
        dedupeKey,
        state: 'interrupted',
      })
      return { sessionId: session._id, roomName: session.roomName }
    }

    // Non-state events (egress, room lifecycle, agent participant churn) are
    // recorded for the audit trail. Artifact reconciliation below intentionally
    // runs even when this event was already recorded.
    if (!matchingEvent) {
      await ctx.db.insert('sessionEvents', {
        orgId: session.orgId,
        sessionId: session._id,
        type: args.event,
        detail,
        source: 'livekit-webhook',
        dedupeKey,
        createdAt: now,
      })
    }

    if (
      args.event === 'room_finished' &&
      session.startedAt &&
      ['live', 'reconnecting', 'interrupted'].includes(session.state)
    ) {
      await finalizeInterviewForProcessing(ctx, session, {
        detail:
          'Interview finalized automatically after the LiveKit room ended.',
        source: 'livekit-webhook',
        dedupeKey: `room-finished-finalize:${session._id}`,
        allowedStates: ['live', 'reconnecting', 'interrupted'],
      })
    }

    if (args.egressId && artifactKey) {
      const artifactType = inferArtifactType(
        args.filename,
        args.manifestLocation
      )
      const requestedStatus = mapArtifactStatus(args.event, Boolean(args.error))
      const incomingUpdatedAt = toIsoFromEpochMs(args.updatedAtMs) ?? now
      const existing = await ctx.db
        .query('recordingArtifacts')
        .withIndex('by_artifact_key', (q) => q.eq('artifactKey', artifactKey))
        .first()
      const status = resolveArtifactStatus(existing?.status, requestedStatus)

      if (!existing) {
        await ctx.db.insert('recordingArtifacts', {
          orgId: session.orgId,
          sessionId: session._id,
          provider: 'livekit',
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
          updatedAt: incomingUpdatedAt,
        })
      } else {
        // Do not replace optional metadata with undefined on a retry. LiveKit's
        // started payload is often sparse while the ended payload is complete.
        await ctx.db.patch(existing._id, {
          orgId: session.orgId,
          sessionId: session._id,
          provider: 'livekit',
          egressId: args.egressId,
          artifactKey,
          roomName: args.roomName,
          artifactType,
          status,
          updatedAt:
            existing.updatedAt.localeCompare(incomingUpdatedAt) > 0
              ? existing.updatedAt
              : incomingUpdatedAt,
          ...(args.filename !== undefined ? { filename: args.filename } : {}),
          ...(args.location !== undefined ? { location: args.location } : {}),
          ...(args.manifestLocation !== undefined
            ? { manifestLocation: args.manifestLocation }
            : {}),
          ...(args.startedAtMs !== undefined
            ? { startedAt: toIsoFromEpochMs(args.startedAtMs) }
            : {}),
          ...(args.endedAtMs !== undefined
            ? { endedAt: toIsoFromEpochMs(args.endedAtMs) }
            : {}),
          ...(args.durationMs !== undefined
            ? { durationMs: args.durationMs }
            : {}),
          ...(args.sizeBytes !== undefined
            ? { sizeBytes: args.sizeBytes }
            : {}),
          ...(args.error !== undefined ? { error: args.error } : {}),
        })
      }
    }

    return {
      sessionId: session._id,
      roomName: session.roomName,
    }
  },
})
