import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { internal } from '../_generated/api'
import { recordInterviewUsage } from './usageRollup'
import { maxActiveDurationMs } from '../../lib/interview/session-purpose'
import {
  PROCESSING_ENTRY_STATES,
  resolveProcessingTransitionPath,
} from '../../lib/interview/session-machine'
import type { InterviewSessionState } from '../../lib/interview/types'
import { applySessionStateTransition } from './interviewSession'

type FinalizeInterviewOptions = {
  detail: string
  source: string
  dedupeKey: string
  allowedStates?: InterviewSessionState[]
}

async function findFinalizeEvent(
  ctx: MutationCtx,
  sessionId: Id<'interviewSessions'>,
  dedupeKey: string
) {
  return await ctx.db
    .query('sessionEvents')
    .withIndex('by_session_and_dedupe_key', (q) =>
      q.eq('sessionId', sessionId).eq('dedupeKey', dedupeKey)
    )
    .first()
}

/**
 * Moves a session into `processing` and schedules the post-call pipeline.
 *
 * `transitioned` is honest: it is true only when the session state actually
 * changed into `processing` during this call. Illegal direct edges
 * (`connecting` / `reconnecting` → `processing`) are normalized through
 * `interrupted` first via {@link resolveProcessingTransitionPath}.
 *
 * Enqueue happens when the transition succeeded, or when the session was
 * already in `processing` (idempotent re-entry via the finalize dedupe key).
 */
export async function finalizeInterviewForProcessing(
  ctx: MutationCtx,
  session: Doc<'interviewSessions'>,
  options: FinalizeInterviewOptions
): Promise<{ queued: boolean; transitioned: boolean }> {
  const allowedStates = options.allowedStates ?? [...PROCESSING_ENTRY_STATES]
  const now = new Date().toISOString()
  const currentState = session.state as InterviewSessionState

  if (currentState === 'processing') {
    const existingFinalize = await findFinalizeEvent(
      ctx,
      session._id,
      options.dedupeKey
    )
    if (existingFinalize) {
      return { queued: true, transitioned: false }
    }

    await ctx.db.insert('sessionEvents', {
      orgId: session.orgId,
      sessionId: session._id,
      type: 'processing-started',
      detail: options.detail,
      source: options.source,
      dedupeKey: options.dedupeKey,
      createdAt: now,
    })

    await ctx.scheduler.runAfter(0, internal.processingPipeline.run, {
      sessionId: session._id,
    })

    return { queued: true, transitioned: false }
  }

  if (!allowedStates.includes(currentState)) {
    const existingFinalize = await findFinalizeEvent(
      ctx,
      session._id,
      options.dedupeKey
    )

    if (existingFinalize) {
      return { queued: true, transitioned: false }
    }

    return { queued: false, transitioned: false }
  }

  const path = resolveProcessingTransitionPath(currentState)
  if (path.length === 0) {
    return { queued: false, transitioned: false }
  }

  let working: Doc<'interviewSessions'> = session
  for (const next of path) {
    const before = working.state as InterviewSessionState
    await applySessionStateTransition(ctx, working, working._id, next)
    const after = await ctx.db.get(working._id)
    if (!after) {
      return { queued: false, transitioned: false }
    }
    // Illegal hop: applySessionStateTransition is a no-op via transitionSessionSafely.
    if ((after.state as InterviewSessionState) === before && before !== next) {
      return { queued: false, transitioned: false }
    }
    working = after
  }

  const reachedProcessing = working.state === 'processing'
  // `currentState` is already narrowed away from `processing` above.
  const transitioned = reachedProcessing

  if (!reachedProcessing) {
    return { queued: false, transitioned: false }
  }

  // Meter the completed interview exactly once. This block only runs on the
  // genuine transition into `processing`; any later finalize for the same
  // session short-circuits at the `currentState === 'processing'` branch above,
  // so usage cannot be double-counted by a retry or a second caller.
  await recordInterviewUsage(ctx, {
    orgId: working.orgId,
    durationMs: working.activeDurationMs ?? 0,
    maxDurationMs: maxActiveDurationMs(working.sessionPurpose),
  })

  const existingFinalize = await findFinalizeEvent(
    ctx,
    session._id,
    options.dedupeKey
  )

  if (existingFinalize) {
    return { queued: true, transitioned }
  }

  await ctx.db.insert('sessionEvents', {
    orgId: session.orgId,
    sessionId: session._id,
    type: 'processing-started',
    detail: options.detail,
    source: options.source,
    dedupeKey: options.dedupeKey,
    createdAt: now,
  })

  await ctx.scheduler.runAfter(0, internal.processingPipeline.run, {
    sessionId: session._id,
  })

  return { queued: true, transitioned }
}

export type InterviewSessionId = Id<'interviewSessions'>
