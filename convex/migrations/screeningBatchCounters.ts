import { v } from 'convex/values'

import { internal } from '../_generated/api'
import { internalMutation } from '../_generated/server'

export const backfillScreeningBatchCounters = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    numItems: v.number(),
  },
  returns: v.object({
    continueCursor: v.string(),
    isDone: v.boolean(),
    scheduled: v.number(),
  }),
  handler: async (ctx, { cursor, numItems }) => {
    const page = await ctx.db.query('screeningBatches').paginate({
      cursor,
      numItems: Math.max(1, Math.min(numItems, 50)),
    })
    for (const batch of page.page) {
      await ctx.scheduler.runAfter(
        0,
        internal.screeningBatchOps.recomputeScreeningBatchCounters,
        { batchId: batch._id }
      )
      await ctx.scheduler.runAfter(
        0,
        internal.screeningBatchOps.refreshScreeningBatchOperationalStats,
        { batchId: batch._id }
      )
    }
    return {
      continueCursor: page.continueCursor,
      isDone: page.isDone,
      scheduled: page.page.length,
    }
  },
})
