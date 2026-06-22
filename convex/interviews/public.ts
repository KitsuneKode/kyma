import { v } from 'convex/values'

import type { Doc } from '../_generated/dataModel'
import { query, type QueryCtx } from '../_generated/server'
import {
  resolveInterviewPolicyFromInvite,
  type InterviewPolicy,
} from '../helpers/interviewPolicy'
import { deriveAccessState } from '../helpers/interviewSession'
import {
  resolveSessionPurpose,
  type SessionPurpose,
} from '../../lib/interview/session-purpose'

const DEFAULT_TEMPLATE_NAME = 'AI Tutor Screener'

type PublicSessionBase =
  | { kind: 'not-found' }
  | {
      kind: 'resolved'
      invite: Doc<'candidateInvites'>
      template: Doc<'assessmentTemplates'> | null
      session: Doc<'interviewSessions'> | null
      access: ReturnType<typeof deriveAccessState>
      policy: InterviewPolicy
      sessionPurpose: SessionPurpose
    }

/**
 * Single resolver for the public candidate read model. Both the lightweight SSR
 * snapshot and the reactive session-detail query derive invite, template,
 * session, access, policy, and purpose from here so the two paths never drift
 * on access gating or policy resolution. Slice fetching stays in the detail
 * query since only it needs transcript/events/recordings.
 */
async function resolvePublicSessionBase(
  ctx: QueryCtx,
  inviteToken: string,
  nowMs: number
): Promise<PublicSessionBase> {
  const invite = await ctx.db
    .query('candidateInvites')
    .withIndex('by_invite_token', (q) => q.eq('inviteToken', inviteToken))
    .first()

  if (!invite) {
    return { kind: 'not-found' }
  }

  const template = await ctx.db.get(invite.templateId)
  const session = await ctx.db
    .query('interviewSessions')
    .withIndex('by_invite', (q) => q.eq('inviteId', invite._id))
    .first()
  const access = deriveAccessState(invite, session, nowMs)
  const { policy } = await resolveInterviewPolicyFromInvite(ctx, invite)
  const sessionPurpose = resolveSessionPurpose(
    session?.sessionPurpose ?? invite.sessionPurpose
  )

  return {
    kind: 'resolved',
    invite,
    template,
    session,
    access,
    policy,
    sessionPurpose,
  }
}

/**
 * The single canonical public candidate read model. Serves both the SSR initial
 * paint and the client's reactive subscription, so there is exactly one source
 * of truth for candidate-facing session state, access gating, policy, and the
 * transcript/events/recordings slices. Slices are only fetched once a session
 * exists and access is available; fresh or gated invites return empty slices
 * without extra reads.
 */
export const getPublicSessionDetail = query({
  args: {
    inviteToken: v.string(),
    nowMs: v.number(),
  },
  handler: async (ctx, { inviteToken, nowMs }) => {
    const base = await resolvePublicSessionBase(ctx, inviteToken, nowMs)

    if (base.kind === 'not-found') {
      return null
    }

    const { invite, template, session, access, policy, sessionPurpose } = base

    if (!session) {
      return {
        inviteId: invite._id,
        sessionId: undefined,
        candidateName: invite.candidateName ?? 'Candidate',
        templateName: template?.name ?? DEFAULT_TEMPLATE_NAME,
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
        templateName: template?.name ?? DEFAULT_TEMPLATE_NAME,
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
      templateName: template?.name ?? DEFAULT_TEMPLATE_NAME,
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
