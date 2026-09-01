import { ConvexError, v } from 'convex/values'

import { mutation } from '../_generated/server'
import type { InterviewSessionState } from '../../lib/interview/types'
import { interviewSessionStateValidator } from '../validators'
import { hasTrustedProcessingKey } from '../helpers/processingAuth'
import {
  assertSessionEventThrottle,
  insertSessionEventWithTransition,
  requireInviteSessionWriteAccess,
} from '../helpers/interviewSession'

/**
 * The single session-event write entry point. Trusted server-origin callers
 * (agent, processing pipeline) authenticate with the processing key; candidate
 * clients authenticate with their invite token. Both paths converge on the same
 * throttle + state-transition logic so server and candidate writes stay in sync.
 */
export const appendSessionEvent = mutation({
  args: {
    inviteToken: v.optional(v.string()),
    processingKey: v.optional(v.string()),
    sessionId: v.id('interviewSessions'),
    type: v.string(),
    detail: v.string(),
    source: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
    state: v.optional(interviewSessionStateValidator),
  },
  handler: async (
    ctx,
    {
      inviteToken,
      processingKey,
      sessionId,
      type,
      detail,
      source,
      dedupeKey,
      state,
    }
  ) => {
    const isTrustedCaller = hasTrustedProcessingKey(processingKey)
    const session = isTrustedCaller
      ? await ctx.db.get(sessionId)
      : (
          await requireInviteSessionWriteAccess(
            ctx,
            sessionId,
            inviteToken ?? ''
          )
        ).session

    if (!session) {
      throw new ConvexError('Interview session not found.')
    }

    await assertSessionEventThrottle(ctx, sessionId)

    // `source` decides whether a state write is permitted, so it must reflect
    // who the caller actually is - never what they claim to be. Only a caller
    // holding the processing key may declare a privileged source; an invite
    // token authenticates a candidate and nothing more.
    const resolvedSource = isTrustedCaller
      ? (source ?? 'assessment-pipeline')
      : 'candidate-client'

    // Candidates may record events, never drive state. `isSessionStateWriteAllowed`
    // is a denylist, so an unlisted terminal state like `failed` slipped
    // through and let a candidate wedge their own interview: no report, no
    // metering, and every later write refused. The invite path therefore
    // carries no state at all - no client sends one today (verified across
    // both browser call sites).
    const resolvedState = isTrustedCaller
      ? (state as InterviewSessionState | undefined)
      : undefined

    return await insertSessionEventWithTransition(ctx, {
      session,
      sessionId,
      type,
      detail,
      source: resolvedSource,
      dedupeKey,
      state: resolvedState,
    })
  },
})
