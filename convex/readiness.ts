import { ConvexError, v } from 'convex/values'

import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server'
import {
  ensureUserForIdentity,
  findUserByIdentity,
} from './helpers/clerkIdentity'

async function resolveSignedInCandidateUserId(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new ConvexError('You must be signed in to access readiness checks.')
  }
  const user = await ensureUserForIdentity(ctx, identity)
  return user._id
}

async function findCandidateUserIdForQuery(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return null
  }
  const user = await findUserByIdentity(ctx, identity)
  return user?._id ?? null
}

export const getCandidateReadinessRuns = query({
  args: {},
  handler: async (ctx) => {
    const candidateUserId = await findCandidateUserIdForQuery(ctx)
    if (!candidateUserId) {
      return []
    }
    const runs = await ctx.db
      .query('candidateReadinessRuns')
      .withIndex('by_candidate_user', (q) =>
        q.eq('candidateUserId', candidateUserId)
      )
      .collect()

    return runs.toSorted((left, right) => right.ranAt.localeCompare(left.ranAt))
  },
})

export const saveCandidateReadinessRun = mutation({
  args: {
    checks: v.object({
      browserSupported: v.boolean(),
      audioInputAvailable: v.boolean(),
      videoInputAvailable: v.boolean(),
      networkOnline: v.boolean(),
      secureContext: v.boolean(),
      mediaPermissionsGranted: v.boolean(),
    }),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const candidateUserId = await resolveSignedInCandidateUserId(ctx)
    return await ctx.db.insert('candidateReadinessRuns', {
      candidateUserId,
      ranAt: new Date().toISOString(),
      checks: args.checks,
      notes: args.notes,
    })
  },
})
