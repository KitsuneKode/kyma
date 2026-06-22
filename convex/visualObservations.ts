import { ConvexError, v } from 'convex/values'

import { mutation } from './_generated/server'
import {
  hasTrustedProcessingKey,
  resolveOrgIdForPipelineWrite,
} from './helpers/processingAuth'
import { recruiterQuery } from './lib/customFunctions'

const visualObservationRecordValidator = v.object({
  id: v.id('visualObservations'),
  observation: v.string(),
  observedAt: v.string(),
  source: v.union(v.literal('agent'), v.literal('system')),
})

export const recordVisualObservation = mutation({
  args: {
    processingKey: v.optional(v.string()),
    sessionId: v.id('interviewSessions'),
    observation: v.string(),
    observedAt: v.optional(v.string()),
    source: v.optional(v.union(v.literal('agent'), v.literal('system'))),
  },
  returns: v.id('visualObservations'),
  handler: async (ctx, args) => {
    if (!hasTrustedProcessingKey(args.processingKey)) {
      throw new ConvexError(
        'Invalid processing key for visual observation write.'
      )
    }

    const observation = args.observation.trim()
    if (!observation) {
      throw new ConvexError('Observation must not be empty.')
    }

    const orgId = await resolveOrgIdForPipelineWrite(
      ctx,
      args.sessionId,
      args.processingKey
    )

    return await ctx.db.insert('visualObservations', {
      orgId,
      sessionId: args.sessionId,
      observation,
      observedAt: args.observedAt ?? new Date().toISOString(),
      source: args.source ?? 'agent',
    })
  },
})

export const listForSession = recruiterQuery({
  args: {
    sessionId: v.id('interviewSessions'),
  },
  returns: v.array(visualObservationRecordValidator),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    if (!session || session.orgId !== ctx.orgId) {
      throw new ConvexError('Interview session not found.')
    }

    const observations = await ctx.db
      .query('visualObservations')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .collect()

    return observations
      .toSorted((left, right) =>
        left.observedAt.localeCompare(right.observedAt)
      )
      .map((entry) => ({
        id: entry._id,
        observation: entry.observation,
        observedAt: entry.observedAt,
        source: entry.source,
      }))
  },
})
