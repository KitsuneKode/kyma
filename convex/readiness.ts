import { ConvexError, v } from 'convex/values'

import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server'

async function resolveSignedInCandidateUserId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new ConvexError('You must be signed in to access readiness checks.')
  }

  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique()
  if (!user) {
    throw new ConvexError('Candidate profile not found.')
  }

  return user._id
}

export const getCandidateReadinessRuns = query({
  args: {},
  handler: async (ctx) => {
    const candidateUserId = await resolveSignedInCandidateUserId(ctx)
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
