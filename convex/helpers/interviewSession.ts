import { ConvexError } from 'convex/values'

import { maxActiveDurationMs } from '../../lib/interview/session-purpose'

import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { transitionSessionSafely } from '../../lib/interview/session-machine'
import { isSessionStateWriteAllowed } from '../../lib/interview/session-state-ownership'
import type { InterviewSessionState } from '../../lib/interview/types'
import type { SessionPurpose } from '../../lib/interview/session-purpose'
import {
  MAX_CANDIDATES_PER_SCREENING_BATCH,
  assertLegacyScreeningBatchWithinLimit,
} from './screeningLimits'

export const WRITE_WINDOW_MS = 60_000
export const MAX_SESSION_EVENTS_PER_WINDOW = 90

export function resolveInviteSessionPurpose(
  invite: Pick<Doc<'candidateInvites'>, 'sessionPurpose'>
): SessionPurpose {
  if (invite.sessionPurpose === 'demo' || invite.sessionPurpose === 'mock') {
    return invite.sessionPurpose
  }
  return 'screening'
}

export async function assertSessionEventThrottle(
  ctx: MutationCtx,
  sessionId: Id<'interviewSessions'>
) {
  const since = new Date(Date.now() - WRITE_WINDOW_MS).toISOString()
  const recent = await ctx.db
    .query('sessionEvents')
    .withIndex('by_session_and_created_at', (q) =>
      q.eq('sessionId', sessionId).gte('createdAt', since)
    )
    .take(MAX_SESSION_EVENTS_PER_WINDOW + 1)

  if (recent.length > MAX_SESSION_EVENTS_PER_WINDOW) {
    throw new ConvexError(
      'Session event rate exceeded. Please wait a moment and try again.'
    )
  }
}

export function isInviteExpired(expiresAt: string, nowMs?: number) {
  const parsed = Date.parse(expiresAt)

  if (Number.isNaN(parsed)) {
    return true
  }

  const now = nowMs ?? Date.now()
  return parsed <= now
}

/** True when the invite is marked expired or past `expiresAt`. */
export function isInviteExpiredOrMarkedExpired(
  invite: Pick<Doc<'candidateInvites'>, 'status' | 'expiresAt'>,
  nowMs?: number
) {
  return invite.status === 'expired' || isInviteExpired(invite.expiresAt, nowMs)
}

const PUBLIC_PROCESSING_SESSION_STATES = [
  'live',
  'reconnecting',
  'interrupted',
  'processing',
] as const

/**
 * Capability check for public post-interview processing enqueue.
 * Aligns invite expiry/status with {@link requireInviteSessionWriteAccess},
 * but allows sessions already in `processing` (invite may be `completed`).
 */
export function canAuthorizePublicSessionProcessing(args: {
  invite: Pick<Doc<'candidateInvites'>, 'status' | 'expiresAt' | '_id'> | null
  session: Pick<Doc<'interviewSessions'>, 'state' | 'inviteId'> | null
  nowMs?: number
}) {
  const { invite, session, nowMs } = args
  if (!invite || !session) {
    return false
  }
  if (`${session.inviteId}` !== `${invite._id}`) {
    return false
  }
  if (isInviteExpiredOrMarkedExpired(invite, nowMs)) {
    return false
  }
  return (PUBLIC_PROCESSING_SESSION_STATES as readonly string[]).includes(
    session.state
  )
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
    isInviteExpiredOrMarkedExpired(invite) ||
    ['completed', 'failed'].includes(session.state)
  ) {
    throw new ConvexError('Session is no longer writable.')
  }

  return { invite, session }
}

export function deriveAccessState(
  invite: Pick<Doc<'candidateInvites'>, 'status' | 'expiresAt'> | null,
  session: Pick<Doc<'interviewSessions'>, 'state'> | null,
  nowMs?: number
) {
  if (!invite) {
    return {
      accessState: 'available' as const,
      accessMessage: undefined,
    }
  }

  if (isInviteExpiredOrMarkedExpired(invite, nowMs)) {
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

  throw new ConvexError('Invite not found.')
}

/**
 * Applies a session state transition (and the side effects that go with
 * reaching a terminal/processing state) shared by the public and internal
 * session-event mutations. Keeping this in one place prevents the two write
 * paths from drifting on duration accounting or invite completion.
 */
export async function applySessionStateTransition(
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
    // First time the interview goes live is the canonical start time.
    if (!session.startedAt) {
      patch.startedAt = nowIso
    }
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
    // Clamp the live segment to the session's own budget. A session abandoned
    // in `live` and finalized later (by the reaper, or a delayed webhook)
    // otherwise accrues the entire wall-clock gap - observed at ~61 days per
    // session against a live deployment. Harmless as a display value, but this
    // number is now metered and billed, so it must reflect a duration the
    // session could physically have had.
    const segmentMs = Math.min(
      durationBetween(session.lastLiveStartedAt, nowIso),
      maxActiveDurationMs(session.sessionPurpose)
    )
    patch.activeDurationMs = (session.activeDurationMs ?? 0) + segmentMs
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
      const eligibility = await ctx.db.get(invite.eligibilityId)
      // Idempotent: only increment completedCount when first transitioning to submitted.
      if (eligibility && eligibility.status !== 'submitted') {
        await ctx.db.patch(invite.eligibilityId, {
          status: 'submitted',
        })
        // Maintain denormalized batch counter transactionally.
        const batch = await ctx.db.get(eligibility.batchId)
        if (batch) {
          if (
            batch.candidateCount === undefined ||
            batch.completedCount === undefined
          ) {
            // Backfill old batches that predate counters.
            const batchEligibility = await ctx.db
              .query('candidateEligibility')
              .withIndex('by_batch', (q) =>
                q.eq('batchId', eligibility.batchId)
              )
              .take(MAX_CANDIDATES_PER_SCREENING_BATCH + 1)
            assertLegacyScreeningBatchWithinLimit(batchEligibility.length)
            const submittedCount = batchEligibility.filter(
              (e) => e.status === 'submitted'
            ).length
            await ctx.db.patch(batch._id, {
              candidateCount: batch.candidateCount ?? batchEligibility.length,
              completedCount: submittedCount,
            })
          } else {
            await ctx.db.patch(batch._id, {
              completedCount: (batch.completedCount ?? 0) + 1,
            })
          }
        }
      }
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
