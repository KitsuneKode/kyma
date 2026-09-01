import { v } from 'convex/values'

import { internalMutation } from './_generated/server'
import { pipelineMutation, pipelineQuery } from './lib/pipelineFunctions'

const workerStatusValidator = v.union(
  v.literal('running'),
  v.literal('draining'),
  v.literal('stopped')
)

/**
 * Trusted heartbeat write from the LiveKit agent worker process. Gated by the
 * processing key so only the backend worker can report liveness. Upserts a
 * single row per workerId.
 */
export const recordWorkerHeartbeat = pipelineMutation({
  args: {
    workerId: v.string(),
    agentName: v.string(),
    status: workerStatusValidator,
    activeJobs: v.optional(v.number()),
    version: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('agentWorkerHeartbeats')
      .withIndex('by_worker_id', (q) => q.eq('workerId', args.workerId))
      .unique()

    const patch = {
      agentName: args.agentName,
      status: args.status,
      activeJobs: args.activeJobs,
      version: args.version,
      lastSeenAt: Date.now(),
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch)
    } else {
      await ctx.db.insert('agentWorkerHeartbeats', {
        workerId: args.workerId,
        ...patch,
      })
    }

    return null
  },
})

const workerLivenessValidator = v.object({
  workers: v.array(
    v.object({
      workerId: v.string(),
      agentName: v.string(),
      status: workerStatusValidator,
      activeJobs: v.optional(v.number()),
      version: v.optional(v.string()),
      lastSeenAt: v.number(),
    })
  ),
  mostRecentSeenAt: v.union(v.number(), v.null()),
})

/**
 * Reap worker heartbeats older than 7 days. Without this, a churning workerId
 * (e.g. per-deploy id) would accumulate unbounded rows.
 */
export const reapStaleWorkerHeartbeats = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    const stale = await ctx.db
      .query('agentWorkerHeartbeats')
      .withIndex('by_last_seen_at')
      .order('asc')
      .take(100)
    let deleted = 0
    for (const heartbeat of stale) {
      if (heartbeat.lastSeenAt < cutoff) {
        await ctx.db.delete(heartbeat._id)
        deleted += 1
      }
    }
    return { deleted }
  },
})

/**
 * Read all worker heartbeats for operator health. Staleness is intentionally
 * computed by the caller (server-side) so this query stays deterministic and
 * cacheable — never read wall-clock time inside a Convex query.
 */
export const getWorkerLiveness = pipelineQuery({
  args: {},
  returns: workerLivenessValidator,
  handler: async (ctx) => {
    const heartbeats = await ctx.db
      .query('agentWorkerHeartbeats')
      .withIndex('by_last_seen_at')
      .order('desc')
      .collect()

    return {
      workers: heartbeats.map((heartbeat) => ({
        workerId: heartbeat.workerId,
        agentName: heartbeat.agentName,
        status: heartbeat.status,
        activeJobs: heartbeat.activeJobs,
        version: heartbeat.version,
        lastSeenAt: heartbeat.lastSeenAt,
      })),
      mostRecentSeenAt: heartbeats[0]?.lastSeenAt ?? null,
    }
  },
})
