import { ConvexError, v } from 'convex/values'

import { hasConfiguredWebhookKey } from './helpers/processingAuth'

import { internalMutation, mutation } from './_generated/server'
import {
  clerkIdFromIdentity,
  ensureUserForIdentity,
} from './helpers/clerkIdentity'

/** Ensures a Convex `users` row exists for the signed-in Clerk account (webhook fallback). */
export const ensureCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError('You must be signed in to sync your profile.')
    }
    const user = await ensureUserForIdentity(ctx, identity)
    return { userId: user._id, clerkId: clerkIdFromIdentity(identity) }
  },
})

/** Internal only — never expose unauthenticated user upserts. */
export const upsertInternal = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    const defaultRole = 'candidate' as const

    if (existing) {
      await ctx.db.patch(existing._id, {
        // Clerk sends partial payloads and Convex deletes fields patched to
        // `undefined`. Losing `email` would break `by_candidate_email`, which
        // is the subject lookup GDPR erasure depends on.
        ...(args.email !== undefined ? { email: args.email } : {}),
        ...(args.name !== undefined ? { name: args.name } : {}),
        updatedAt: now,
      })
      return existing._id
    }

    return await ctx.db.insert('users', {
      clerkId: args.clerkId,
      ...(args.email !== undefined ? { email: args.email } : {}),
      ...(args.name !== undefined ? { name: args.name } : {}),
      role: defaultRole,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const syncFromClerkWebhook = mutation({
  args: {
    writeKey: v.string(),
    eventType: v.string(),
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    preferredWorkspace: v.optional(
      v.union(v.literal('candidate'), v.literal('recruiter'))
    ),
  },
  handler: async (ctx, args) => {
    // Shared, constant-time, fail-closed guard - a third local copy of this
    // comparison was the last non-constant-time one in the codebase.
    if (!hasConfiguredWebhookKey(args.writeKey)) {
      throw new ConvexError('Invalid write key for Clerk webhook sync.')
    }

    const now = Date.now()
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    if (args.eventType === 'user.deleted') {
      if (!existing) return null
      await ctx.db.delete(existing._id)
      return existing._id
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        // Clerk sends partial payloads and Convex deletes fields patched to
        // `undefined`. Losing `email` would break `by_candidate_email`, which
        // is the subject lookup GDPR erasure depends on.
        ...(args.email !== undefined ? { email: args.email } : {}),
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.preferredWorkspace
          ? { preferredWorkspace: args.preferredWorkspace }
          : {}),
        updatedAt: now,
      })
      return existing._id
    }

    return await ctx.db.insert('users', {
      clerkId: args.clerkId,
      ...(args.email !== undefined ? { email: args.email } : {}),
      ...(args.name !== undefined ? { name: args.name } : {}),
      preferredWorkspace: args.preferredWorkspace,
      role: 'candidate',
      createdAt: now,
      updatedAt: now,
    })
  },
})
