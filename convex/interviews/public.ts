import { v } from 'convex/values'

import type { Doc } from '../_generated/dataModel'
import { query, type QueryCtx } from '../_generated/server'
import {
  resolveInterviewPolicyFromInvite,
  type InterviewPolicy,
} from '../helpers/interviewPolicy'
import {
  canAuthorizePublicSessionProcessing,
  deriveAccessState,
} from '../helpers/interviewSession'
import {
  DEFAULT_SESSION_EVENTS_LIMIT,
  DEFAULT_SESSION_RECORDINGS_LIMIT,
  DEFAULT_SESSION_TRANSCRIPT_LIMIT,
  loadSessionReviewSlices,
  resolveTemplateName,
} from '../helpers/sessionReview'
import {
  interviewPolicyValidator,
  interviewSessionStateValidator,
  inviteAccessStateValidator,
  sessionPurposeValidator,
} from '../validators'
import {
  resolveSessionPurpose,
  type SessionPurpose,
} from '../../lib/interview/session-purpose'

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

const publicSessionEventValidator = v.object({
  type: v.string(),
  detail: v.string(),
  createdAt: v.string(),
})

const publicTranscriptSegmentValidator = v.object({
  id: v.string(),
  speaker: v.union(
    v.literal('agent'),
    v.literal('candidate'),
    v.literal('system')
  ),
  text: v.string(),
  status: v.union(v.literal('partial'), v.literal('final')),
  startedAt: v.string(),
  endedAt: v.optional(v.string()),
})

const publicRecordingArtifactValidator = v.object({
  id: v.string(),
  provider: v.literal('livekit'),
  egressId: v.string(),
  artifactKey: v.string(),
  roomName: v.string(),
  artifactType: v.union(
    v.literal('audio'),
    v.literal('video'),
    v.literal('composite'),
    v.literal('segments')
  ),
  status: v.union(
    v.literal('starting'),
    v.literal('active'),
    v.literal('complete'),
    v.literal('failed')
  ),
  filename: v.optional(v.string()),
  location: v.optional(v.string()),
  manifestLocation: v.optional(v.string()),
  startedAt: v.optional(v.string()),
  endedAt: v.optional(v.string()),
  durationMs: v.optional(v.number()),
  sizeBytes: v.optional(v.number()),
  error: v.optional(v.string()),
})

const publicSessionDetailValidator = v.object({
  inviteId: v.id('candidateInvites'),
  sessionId: v.optional(v.id('interviewSessions')),
  candidateName: v.string(),
  templateName: v.string(),
  state: interviewSessionStateValidator,
  sessionPurpose: sessionPurposeValidator,
  accessState: inviteAccessStateValidator,
  accessMessage: v.optional(v.string()),
  policy: interviewPolicyValidator,
  roomName: v.optional(v.string()),
  activeDurationMs: v.number(),
  events: v.array(publicSessionEventValidator),
  transcript: v.array(publicTranscriptSegmentValidator),
  recordings: v.array(publicRecordingArtifactValidator),
})

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
  returns: v.union(publicSessionDetailValidator, v.null()),
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
        templateName: resolveTemplateName(template?.name),
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
        templateName: resolveTemplateName(template?.name),
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

    const [{ events, transcript }, recordings] = await Promise.all([
      loadSessionReviewSlices(ctx, session._id, undefined, {
        transcriptLimit: DEFAULT_SESSION_TRANSCRIPT_LIMIT,
        eventsLimit: DEFAULT_SESSION_EVENTS_LIMIT,
      }),
      ctx.db
        .query('recordingArtifacts')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .take(DEFAULT_SESSION_RECORDINGS_LIMIT),
    ])

    return {
      inviteId: invite._id,
      sessionId: session._id,
      candidateName: invite.candidateName ?? 'Candidate',
      templateName: resolveTemplateName(template?.name),
      state: session.state,
      sessionPurpose,
      ...access,
      policy,
      roomName: session.roomName,
      activeDurationMs: session.activeDurationMs ?? 0,
      events: events.map((event) => ({
        type: event.type,
        detail: event.detail,
        createdAt: event.createdAt,
      })),
      transcript: transcript.map((segment) => ({
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
  returns: v.boolean(),
  handler: async (ctx, { inviteToken, sessionId }) => {
    const invite = await ctx.db
      .query('candidateInvites')
      .withIndex('by_invite_token', (q) => q.eq('inviteToken', inviteToken))
      .first()
    const session = await ctx.db.get(sessionId)
    return canAuthorizePublicSessionProcessing({ invite, session })
  },
})
