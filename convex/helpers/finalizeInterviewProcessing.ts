import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'
import { internal } from '../_generated/api'
import type { InterviewSessionState } from '../../lib/interview/types'
import { applySessionStateTransition } from './interviewSession'

type FinalizeInterviewOptions = {
  detail: string
  source: string
  dedupeKey: string
  allowedStates?: InterviewSessionState[]
}

export async function finalizeInterviewForProcessing(
  ctx: MutationCtx,
  session: Doc<'interviewSessions'>,
  options: FinalizeInterviewOptions
): Promise<{ queued: boolean; transitioned: boolean }> {
  const allowedStates = options.allowedStates ?? [
    'live',
    'reconnecting',
    'interrupted',
    'connecting',
  ]
  const now = new Date().toISOString()

  if (!allowedStates.includes(session.state as InterviewSessionState)) {
    const existingFinalize = await ctx.db
      .query('sessionEvents')
      .withIndex('by_session_and_dedupe_key', (q) =>
        q.eq('sessionId', session._id).eq('dedupeKey', options.dedupeKey)
      )
      .first()

    if (existingFinalize) {
      return { queued: true, transitioned: false }
    }

    return { queued: false, transitioned: false }
  }

  // Reuse the shared transition so duration accounting, endedAt, and invite/
  // eligibility completion stay on one path with the candidate and webhook
  // session-event writes.
  await applySessionStateTransition(ctx, session, session._id, 'processing')

  const existingFinalize = await ctx.db
    .query('sessionEvents')
    .withIndex('by_session_and_dedupe_key', (q) =>
      q.eq('sessionId', session._id).eq('dedupeKey', options.dedupeKey)
    )
    .first()

  if (existingFinalize) {
    return { queued: true, transitioned: true }
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

  return { queued: true, transitioned: true }
}

export type InterviewSessionId = Id<'interviewSessions'>
