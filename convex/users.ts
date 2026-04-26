import { ConvexError, v } from 'convex/values'

import { mutation } from './_generated/server'
import { requireAdmin } from './helpers/auth'
import { runtimeEnv } from '../lib/env/runtime'

function isBootstrapAdminEmail(email?: string) {
  if (!email) return false
  const allowlist =
    runtimeEnv.KYMA_ADMIN_EMAILS?.split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean) ?? []
  return allowlist.includes(email.toLowerCase())
}

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
