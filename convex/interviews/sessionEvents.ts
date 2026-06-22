import { ConvexError, v } from 'convex/values'

import { internalMutation, mutation } from '../_generated/server'
import { isDevelopmentMode } from '../../lib/runtime-mode'
import { runtimeEnv } from '../../lib/env/runtime'
import type { InterviewSessionState } from '../../lib/interview/types'
import { interviewSessionStateValidator } from '../validators'
import {
  assertSessionEventThrottle,
  insertSessionEventWithTransition,
  requireInviteSessionWriteAccess,
} from '../helpers/interviewSession'

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
    const configuredProcessingKey = runtimeEnv.KYMA_PROCESSING_WRITE_KEY?.trim()
    const hasTrustedKey =
      Boolean(configuredProcessingKey) &&
      processingKey === configuredProcessingKey
    const allowDevelopmentBypass =
      !configuredProcessingKey && isDevelopmentMode(runtimeEnv.NODE_ENV)

    const session =
      hasTrustedKey || allowDevelopmentBypass
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

    return await insertSessionEventWithTransition(ctx, {
      session,
      sessionId,
      type,
      detail,
      source: source ?? 'candidate-client',
      dedupeKey,
      state: state as InterviewSessionState | undefined,
    })
  },
})

export const appendSessionEventInternal = internalMutation({
  args: {
    sessionId: v.id('interviewSessions'),
    type: v.string(),
    detail: v.string(),
    source: v.string(),
    dedupeKey: v.optional(v.string()),
    state: v.optional(interviewSessionStateValidator),
  },
  handler: async (
    ctx,
    { sessionId, type, detail, source, dedupeKey, state }
  ) => {
    const session = await ctx.db.get(sessionId)
    if (!session) {
      throw new ConvexError('Interview session not found.')
    }

    return await insertSessionEventWithTransition(ctx, {
      session,
      sessionId,
      type,
      detail,
      source,
      dedupeKey,
      state: state as InterviewSessionState | undefined,
    })
  },
})
