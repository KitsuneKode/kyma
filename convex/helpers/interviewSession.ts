import { ConvexError } from 'convex/values'

import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { transitionSessionSafely } from '../../lib/interview/session-machine'
import { isSessionStateWriteAllowed } from '../../lib/interview/session-state-ownership'
import type { InterviewSessionState } from '../../lib/interview/types'
import type { SessionPurpose } from '../../lib/interview/session-purpose'
import {
  DEFAULT_INTERVIEW_DURATION_MINUTES,
  type InterviewPolicy,
} from './interviewPolicy'
import { ensureDefaultTemplate } from './templates'
import { isEnabledDemoInviteToken as isEnabledDemoInviteTokenForEnv } from '../../lib/interview/demo-invite'
import { runtimeEnv } from '../../lib/env/runtime'

export const WRITE_WINDOW_MS = 60_000
export const MAX_SESSION_EVENTS_PER_WINDOW = 90
export const DEMO_ORG_ID = 'org_demo'

export function isEnabledDemoInviteToken(inviteToken: string) {
  return isEnabledDemoInviteTokenForEnv(inviteToken, runtimeEnv)
}

export function resolveInviteSessionPurpose(
  invite: Pick<Doc<'candidateInvites'>, 'sessionPurpose'>
): SessionPurpose {
  if (invite.sessionPurpose === 'demo' || invite.sessionPurpose === 'mock') {
    return invite.sessionPurpose
  }
  return 'screening'
}

export function defaultDemoPolicy(expiresAt: string): InterviewPolicy {
  return {
    durationMode: 'timed',
    targetDurationMinutes: DEFAULT_INTERVIEW_DURATION_MINUTES,
    allowsResume: true,
    maxAttempts: 1,
    expiresAt,
    rubricVersion: 'v1',
    templateName: 'AI Tutor Screener',
    interviewStyleMode: 'standard',
  }
}

export async function assertSessionEventThrottle(
  ctx: MutationCtx,
  sessionId: Id<'interviewSessions'>
) {
  const since = new Date(Date.now() - WRITE_WINDOW_MS).toISOString()
  const events = await ctx.db
    .query('sessionEvents')
    .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
    .collect()
  const recent = events.filter((event) => event.createdAt >= since)

  if (recent.length > MAX_SESSION_EVENTS_PER_WINDOW) {
    throw new ConvexError(
      'Session event rate exceeded. Please wait a moment and try again.'
    )
  }
}

export function isInviteExpired(expiresAt: string) {
  const parsed = Date.parse(expiresAt)

  if (Number.isNaN(parsed)) {
    return true
  }

  return parsed <= Date.now()
}

export async function requireInviteSessionWriteAccess(
  ctx: MutationCtx,
  sessionId: Id<'interviewSessions'>,
  inviteToken: string
) {
  const invite = await ctx.db
    .query('candidateInvites')
    .withIndex('by_invite_token', (q) => q.eq('inviteToken', inviteToken))
    .first()

  if (!invite) {
    throw new ConvexError('Invalid candidate invite token.')
  }

  const session = await ctx.db.get(sessionId)
  if (!session || `${session.inviteId}` !== `${invite._id}`) {
    throw new ConvexError('Session write denied for this invite.')
  }

  if (
    invite.status === 'expired' ||
    isInviteExpired(invite.expiresAt) ||
    ['completed', 'failed'].includes(session.state)
  ) {
    throw new ConvexError('Session is no longer writable.')
  }

  return { invite, session }
}

export function deriveAccessState(
  invite: Pick<Doc<'candidateInvites'>, 'status' | 'expiresAt'> | null,
  session: Pick<Doc<'interviewSessions'>, 'state'> | null
) {
  if (!invite) {
    return {
      accessState: 'available' as const,
      accessMessage: undefined,
    }
  }

  if (invite.status === 'expired' || isInviteExpired(invite.expiresAt)) {
    return {
      accessState: 'expired' as const,
      accessMessage:
        'This interview link has expired. Please request a new one from the recruiter.',
    }
  }

  if (
    invite.status === 'completed' ||
    session?.state === 'processing' ||
    session?.state === 'completed'
  ) {
    return {
      accessState: 'consumed' as const,
      accessMessage:
        'This invite has already been used for a submitted interview and cannot be started again.',
    }
  }

  return {
    accessState: 'available' as const,
    accessMessage: undefined,
  }
}

export function durationBetween(start?: string, end?: string) {
  if (!start || !end) return 0
  const startMs = Date.parse(start)
  const endMs = Date.parse(end)
  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs) ||
    endMs <= startMs
  ) {
    return 0
  }
  return endMs - startMs
}

export async function ensureInvite(
  ctx: MutationCtx,
  inviteToken: string
): Promise<Doc<'candidateInvites'>> {
  const existingInvite = await ctx.db
    .query('candidateInvites')
    .withIndex('by_invite_token', (q) => q.eq('inviteToken', inviteToken))
    .first()

  if (existingInvite) {
    return existingInvite
  }

  if (!isEnabledDemoInviteToken(inviteToken)) {
    throw new ConvexError('Invite not found.')
  }

  const template = await ensureDefaultTemplate(ctx, DEMO_ORG_ID)
  const inviteId = await ctx.db.insert('candidateInvites', {
    orgId: DEMO_ORG_ID,
    inviteToken,
    candidateName: 'Demo Candidate',
    templateId: template._id,
    status: 'created',
    sessionPurpose: 'demo',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  })

  const invite = await ctx.db.get(inviteId)

  if (!invite) {
    throw new ConvexError('Unable to create development invite.')
  }

  return invite
}

/**
 * Applies a session state transition (and the side effects that go with
 * reaching a terminal/processing state) shared by the public and internal
 * session-event mutations. Keeping this in one place prevents the two write
 * paths from drifting on duration accounting or invite completion.
 */
async function applySessionStateTransition(
  ctx: MutationCtx,
  session: Doc<'interviewSessions'>,
  sessionId: Id<'interviewSessions'>,
  state: InterviewSessionState
) {
  const nextState = transitionSessionSafely(
    session.state as InterviewSessionState,
    state
  )
  const patch: Partial<Doc<'interviewSessions'>> = {
    state: nextState,
  }
  const nowIso = new Date().toISOString()

  if (nextState === 'live' && session.state !== 'live') {
    patch.lastLiveStartedAt = nowIso
  }

  if (
    [
      'reconnecting',
      'interrupted',
      'processing',
      'completed',
      'failed',
    ].includes(nextState) &&
    session.lastLiveStartedAt
  ) {
    patch.activeDurationMs =
      (session.activeDurationMs ?? 0) +
      durationBetween(session.lastLiveStartedAt, nowIso)
    patch.lastLiveStartedAt = undefined
  }

  if (
    (nextState === 'processing' || nextState === 'completed') &&
    !session.endedAt
  ) {
    patch.endedAt = nowIso
  }

  await ctx.db.patch(sessionId, patch)

  if (nextState === 'processing' || nextState === 'completed') {
    const invite = await ctx.db.get(session.inviteId)

    await ctx.db.patch(session.inviteId, {
      status: 'completed',
    })

    if (invite?.eligibilityId) {
      await ctx.db.patch(invite.eligibilityId, {
        status: 'submitted',
      })
    }
  }
}

/**
 * Dedupe-aware session event insert with optional state transition. Shared by
 * the candidate-facing and internal/server-origin session-event mutations.
 */
export async function insertSessionEventWithTransition(
  ctx: MutationCtx,
  args: {
    session: Doc<'interviewSessions'>
    sessionId: Id<'interviewSessions'>
    type: string
    detail: string
    source: string
    dedupeKey?: string
    state?: InterviewSessionState
  }
): Promise<Id<'sessionEvents'>> {
  const { session, sessionId, type, detail, source, dedupeKey, state } = args

  if (dedupeKey) {
    const existingEvent = await ctx.db
      .query('sessionEvents')
      .withIndex('by_session_and_dedupe_key', (q) =>
        q.eq('sessionId', sessionId).eq('dedupeKey', dedupeKey)
      )
      .first()
    if (existingEvent) {
      return existingEvent._id
    }
  }

  const eventId = await ctx.db.insert('sessionEvents', {
    orgId: session.orgId,
    sessionId,
    type,
    detail,
    source,
    dedupeKey,
    createdAt: new Date().toISOString(),
  })

  if (state) {
    if (!isSessionStateWriteAllowed(source, state)) {
      return eventId
    }

    await applySessionStateTransition(ctx, session, sessionId, state)
  }

  return eventId
}
