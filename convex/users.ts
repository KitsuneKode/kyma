import { ConvexError, v } from 'convex/values'

import { mutation } from './_generated/server'
import { requireAdmin } from './helpers/auth'
import {
  clerkIdFromIdentity,
  ensureUserForIdentity,
} from './helpers/clerkIdentity'
import { runtimeEnv } from '../lib/env/runtime'

function isBootstrapAdminEmail(email?: string) {
  if (!email) return false
  const allowlist =
    runtimeEnv.KYMA_ADMIN_EMAILS?.split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean) ?? []
  return allowlist.includes(email.toLowerCase())
}

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

export const upsert = mutation({
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

    const defaultRole = isBootstrapAdminEmail(args.email)
      ? 'admin'
      : 'candidate'

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        updatedAt: now,
      })
      return existing._id
    }

    return await ctx.db.insert('users', {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      role: defaultRole,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const setUserRole = mutation({
  args: {
    userId: v.id('users'),
    role: v.union(
      v.literal('admin'),
      v.literal('recruiter'),
      v.literal('candidate')
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new ConvexError('User not found.')
    }
    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    })
    return args.userId
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
    const expectedKey = runtimeEnv.KYMA_PROCESSING_WRITE_KEY?.trim()
    if (!expectedKey) {
      throw new ConvexError(
        'KYMA_PROCESSING_WRITE_KEY is required for Clerk webhook sync.'
      )
    }
    if (args.writeKey !== expectedKey) {
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
        email: args.email,
        name: args.name,
        ...(args.preferredWorkspace
          ? { preferredWorkspace: args.preferredWorkspace }
          : {}),
        updatedAt: now,
      })
      return existing._id
    }

    return await ctx.db.insert('users', {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      preferredWorkspace: args.preferredWorkspace,
      role: isBootstrapAdminEmail(args.email) ? 'admin' : 'candidate',
      createdAt: now,
      updatedAt: now,
    })
  },
})
