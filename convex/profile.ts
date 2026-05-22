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

const DEFAULT_PREFERENCES = {
  preferredInterviewLanguage: 'English',
  preferredInterviewLengthMinutes: 20,
  timezone: 'UTC',
  accessibilityNotes: '',
} as const

async function resolveSignedInCandidateUserId(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new ConvexError(
      'You must be signed in to manage profile preferences.'
    )
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

export const getCandidatePreferences = query({
  args: {},
  handler: async (ctx) => {
    const candidateUserId = await findCandidateUserIdForQuery(ctx)
    if (!candidateUserId) {
      return { ...DEFAULT_PREFERENCES }
    }

    const existing = await ctx.db
      .query('candidatePreferences')
      .withIndex('by_candidate_user', (q) =>
        q.eq('candidateUserId', candidateUserId)
      )
      .unique()

    if (!existing) {
      return { ...DEFAULT_PREFERENCES }
    }

    return {
      preferredInterviewLanguage: existing.preferredInterviewLanguage,
      preferredInterviewLengthMinutes: existing.preferredInterviewLengthMinutes,
      timezone: existing.timezone,
      accessibilityNotes: existing.accessibilityNotes ?? '',
    }
  },
})

export const saveCandidatePreferences = mutation({
  args: {
    preferredInterviewLanguage: v.string(),
    preferredInterviewLengthMinutes: v.number(),
    timezone: v.string(),
    accessibilityNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const candidateUserId = await resolveSignedInCandidateUserId(ctx)
    const existing = await ctx.db
      .query('candidatePreferences')
      .withIndex('by_candidate_user', (q) =>
        q.eq('candidateUserId', candidateUserId)
      )
      .unique()
    const updatedAt = new Date().toISOString()

    if (!existing) {
      return await ctx.db.insert('candidatePreferences', {
        candidateUserId,
        preferredInterviewLanguage: args.preferredInterviewLanguage,
        preferredInterviewLengthMinutes: args.preferredInterviewLengthMinutes,
        timezone: args.timezone,
        accessibilityNotes: args.accessibilityNotes,
        updatedAt,
      })
    }

    await ctx.db.patch(existing._id, {
      preferredInterviewLanguage: args.preferredInterviewLanguage,
      preferredInterviewLengthMinutes: args.preferredInterviewLengthMinutes,
      timezone: args.timezone,
      accessibilityNotes: args.accessibilityNotes,
      updatedAt,
    })
    return existing._id
  },
})
