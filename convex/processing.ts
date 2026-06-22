import { v } from 'convex/values'

import { internal } from './_generated/api'
import { internalAction } from './_generated/server'

/** @deprecated Use internal.processingPipeline.run for enqueue + inline fallback. */
export const enqueueInterviewProcessing = internalAction({
  args: {
    sessionId: v.id('interviewSessions'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.processingPipeline.run, args)
    return null
  },
})
