import { v } from 'convex/values'

import { query } from '../_generated/server'
import { resolveInterviewPolicyFromInvite } from '../helpers/interviewPolicy'
import {
  defaultDemoPolicy,
  deriveAccessState,
  isEnabledDemoInviteToken,
} from '../helpers/interviewSession'
import { resolveSessionPurpose } from '../../lib/interview/session-purpose'

export const getPublicInterviewSnapshot = query({
  args: {
    inviteToken: v.string(),
    nowMs: v.number(),
  },
  handler: async (ctx, { inviteToken, nowMs }) => {
    const invite = await ctx.db
      .query('candidateInvites')
      .withIndex('by_invite_token', (q) => q.eq('inviteToken', inviteToken))
      .first()

    if (!invite && !isEnabledDemoInviteToken(inviteToken)) {
      return null
    }

    if (!invite) {
      return {
        inviteToken,
        templateName: 'AI Tutor Screener',
        candidateName: 'Demo Candidate',
        state: 'ready' as const,
        accessState: 'available' as const,
        accessMessage: undefined,
        policy: defaultDemoPolicy(
          new Date(nowMs + 1000 * 60 * 60 * 24).toISOString()
        ),
        sessionPurpose: 'demo' as const,
      }
    }

    const template = await ctx.db.get(invite.templateId)
    const session = await ctx.db
      .query('interviewSessions')
      .withIndex('by_invite', (q) => q.eq('inviteId', invite._id))
      .first()
    const { policy } = await resolveInterviewPolicyFromInvite(ctx, invite)
    const sessionPurpose = resolveSessionPurpose(invite.sessionPurpose)

    return {
      inviteToken,
      templateName: template?.name ?? 'AI Tutor Screener',
      candidateName: invite.candidateName ?? 'Candidate',
      state: session?.state ?? ('ready' as const),
      sessionPurpose,
      ...deriveAccessState(invite, session),
      policy,
    }
  },
})

export const getPublicSessionDetail = query({
  args: {
    inviteToken: v.string(),
    nowMs: v.number(),
  },
  handler: async (ctx, { inviteToken, nowMs }) => {
    const invite = await ctx.db
      .query('candidateInvites')
      .withIndex('by_invite_token', (q) => q.eq('inviteToken', inviteToken))
      .first()

    if (!invite && !isEnabledDemoInviteToken(inviteToken)) {
      return null
    }

    if (!invite) {
      return {
        inviteId: inviteToken,
        sessionId: undefined,
        candidateName: 'Demo Candidate',
        templateName: 'AI Tutor Screener',
        state: 'ready' as const,
        accessState: 'available' as const,
        accessMessage: undefined,
        policy: defaultDemoPolicy(
          new Date(nowMs + 1000 * 60 * 60 * 24).toISOString()
        ),
        roomName: undefined,
        activeDurationMs: 0,
        sessionPurpose: 'demo' as const,
        events: [],
        transcript: [],
        recordings: [],
      }
    }

    const template = await ctx.db.get(invite.templateId)
    const session = await ctx.db
      .query('interviewSessions')
      .withIndex('by_invite', (q) => q.eq('inviteId', invite._id))
      .first()
    const access = deriveAccessState(invite, session)
    const { policy } = await resolveInterviewPolicyFromInvite(ctx, invite)
    const sessionPurpose = resolveSessionPurpose(
      session?.sessionPurpose ?? invite.sessionPurpose
    )

    if (!session) {
      return {
        inviteId: invite._id,
        sessionId: undefined,
        candidateName: invite.candidateName ?? 'Candidate',
        templateName: template?.name ?? 'AI Tutor Screener',
        state: 'ready' as const,
        sessionPurpose,
        ...access,
        policy,
        roomName: undefined,
        activeDurationMs: 0,
        events: [],
        transcript: [],
        recordings: [],
      }
    }

    if (access.accessState !== 'available') {
      return {
        inviteId: invite._id,
        sessionId: session._id,
        candidateName: invite.candidateName ?? 'Candidate',
        templateName: template?.name ?? 'AI Tutor Screener',
        state: session.state,
        sessionPurpose,
        ...access,
        policy,
        roomName: undefined,
        activeDurationMs: session.activeDurationMs ?? 0,
        events: [],
        transcript: [],
        recordings: [],
      }
    }

    const [events, transcript, recordings] = await Promise.all([
      ctx.db
        .query('sessionEvents')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .collect(),
      ctx.db
        .query('transcriptSegments')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .collect(),
      ctx.db
        .query('recordingArtifacts')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .collect(),
    ])

    return {
      inviteId: invite._id,
      sessionId: session._id,
      candidateName: invite.candidateName ?? 'Candidate',
      templateName: template?.name ?? 'AI Tutor Screener',
      state: session.state,
      sessionPurpose,
      ...access,
      policy,
      roomName: session.roomName,
      activeDurationMs: session.activeDurationMs ?? 0,
      events: events
        .toSorted((left, right) =>
          left.createdAt.localeCompare(right.createdAt)
        )
        .map((event) => ({
          type: event.type,
          detail: event.detail,
          createdAt: event.createdAt,
        })),
      transcript: transcript
        .toSorted((left, right) =>
          left.startedAt.localeCompare(right.startedAt)
        )
        .map((segment) => ({
          id: `${segment._id}`,
          speaker: segment.speaker,
          text: segment.text,
          status: segment.status,
          startedAt: segment.startedAt,
          endedAt: segment.endedAt,
        })),
      recordings: recordings
        .toSorted((left, right) =>
          left.updatedAt.localeCompare(right.updatedAt)
        )
        .map((artifact) => ({
          id: `${artifact._id}`,
          provider: artifact.provider,
          egressId: artifact.egressId,
          artifactKey: artifact.artifactKey,
          roomName: artifact.roomName,
          artifactType: artifact.artifactType,
          status: artifact.status,
          filename: artifact.filename,
          location: artifact.location,
          manifestLocation: artifact.manifestLocation,
          startedAt: artifact.startedAt,
          endedAt: artifact.endedAt,
          durationMs: artifact.durationMs,
          sizeBytes: artifact.sizeBytes,
          error: artifact.error,
        })),
    }
  },
})

export const verifyPublicSessionProcessingAccess = query({
  args: {
    inviteToken: v.string(),
    sessionId: v.id('interviewSessions'),
  },
  handler: async (ctx, { inviteToken, sessionId }) => {
    const invite = await ctx.db
      .query('candidateInvites')
      .withIndex('by_invite_token', (q) => q.eq('inviteToken', inviteToken))
      .first()
    if (!invite) {
      return false
    }
    const session = await ctx.db.get(sessionId)
    if (!session || `${session.inviteId}` !== `${invite._id}`) {
      return false
    }
    return ['live', 'reconnecting', 'interrupted', 'processing'].includes(
      session.state
    )
  },
})
