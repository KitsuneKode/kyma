import { ConvexError, v } from 'convex/values'

import { mutation } from './_generated/server'
import { convexEnv } from '../lib/env/convex'

function requireWebhookWriteKey(writeKey: string) {
  const expectedKey = convexEnv.KYMA_PROCESSING_WRITE_KEY?.trim()
  if (!expectedKey) {
    throw new ConvexError(
      'KYMA_PROCESSING_WRITE_KEY is required for Clerk webhook sync.'
    )
  }
  if (writeKey !== expectedKey) {
    throw new ConvexError('Invalid write key for Clerk webhook sync.')
  }
}

export const syncOrgFromClerkWebhook = mutation({
  args: {
    writeKey: v.string(),
    eventType: v.string(),
    clerkOrgId: v.string(),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireWebhookWriteKey(args.writeKey)
    const now = Date.now()
    const existing = await ctx.db
      .query('organizations')
      .withIndex('by_clerk_org_id', (q) => q.eq('clerkOrgId', args.clerkOrgId))
      .unique()

    if (args.eventType === 'organization.deleted') {
      if (existing) {
        await ctx.db.delete(existing._id)
      }
      return null
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name ?? existing.name,
        slug: args.slug,
        imageUrl: args.imageUrl,
        updatedAt: now,
      })
      return existing._id
    }

    return await ctx.db.insert('organizations', {
      clerkOrgId: args.clerkOrgId,
      name: args.name ?? 'Organization',
      slug: args.slug,
      imageUrl: args.imageUrl,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const syncMembershipFromClerkWebhook = mutation({
  args: {
    writeKey: v.string(),
    eventType: v.string(),
    clerkMembershipId: v.string(),
    clerkOrgId: v.string(),
    clerkUserId: v.string(),
    role: v.string(),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    requireWebhookWriteKey(args.writeKey)
    const now = Date.now()
    const existing = await ctx.db
      .query('orgMemberships')
      .withIndex('by_clerk_membership_id', (q) =>
        q.eq('clerkMembershipId', args.clerkMembershipId)
      )
      .unique()

    if (args.eventType === 'organizationMembership.deleted') {
      if (existing) {
        await ctx.db.delete(existing._id)
      }
      return null
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        clerkOrgId: args.clerkOrgId,
        clerkUserId: args.clerkUserId,
        role: args.role,
        permissions: args.permissions,
        updatedAt: now,
      })
      return existing._id
    }

    return await ctx.db.insert('orgMemberships', {
      clerkMembershipId: args.clerkMembershipId,
      clerkOrgId: args.clerkOrgId,
      clerkUserId: args.clerkUserId,
      role: args.role,
      permissions: args.permissions,
      createdAt: now,
      updatedAt: now,
    })
  },
})
