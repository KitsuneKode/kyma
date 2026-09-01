import { ConvexError, v } from 'convex/values'

import { requireSessionOrgId } from './helpers/processingAuth'
import { recruiterQuery } from './lib/customFunctions'
import { pipelineMutation } from './lib/pipelineFunctions'

const MAX_VISUAL_OBSERVATIONS = 100

const visualObservationRecordValidator = v.object({
  id: v.id('visualObservations'),
  observation: v.string(),
  observedAt: v.string(),
  source: v.union(v.literal('agent'), v.literal('system')),
})

export const recordVisualObservation = pipelineMutation({
  args: {
    sessionId: v.id('interviewSessions'),
    observation: v.string(),
    observedAt: v.optional(v.string()),
    source: v.optional(v.union(v.literal('agent'), v.literal('system'))),
  },
  returns: v.id('visualObservations'),
  handler: async (ctx, args) => {
    const observation = args.observation.trim()
    if (!observation) {
      throw new ConvexError('Observation must not be empty.')
    }

    const orgId = await requireSessionOrgId(ctx, args.sessionId)

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
      .withIndex('by_session_and_observed_at', (q) =>
        q.eq('sessionId', args.sessionId)
      )
      .order('desc')
      .take(MAX_VISUAL_OBSERVATIONS)

    return observations.toReversed().map((entry) => ({
      id: entry._id,
      observation: entry.observation,
      observedAt: entry.observedAt,
      source: entry.source,
    }))
  },
})
