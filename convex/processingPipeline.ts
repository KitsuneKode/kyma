'use node'

import { v } from 'convex/values'

import { internalAction } from './_generated/server'
import { runInterviewProcessingPipeline } from '../lib/processing/run-interview-processing-pipeline'

export const run = internalAction({
  args: {
    sessionId: v.id('interviewSessions'),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    await runInterviewProcessingPipeline(args.sessionId)
    return null
  },
})
