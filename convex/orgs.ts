import { ConvexError, v } from 'convex/values'

import { mutation } from './_generated/server'
import { hasTrustedProcessingKey } from './helpers/processingAuth'

/**
 * Delegates to the shared processing-key guard rather than re-implementing the
 * comparison. The local copy checked only the key, missing the deployment-mode
 * check that keeps a missing key from being trusted outside development.
 */
function requireWebhookWriteKey(writeKey: string) {
  if (!hasTrustedProcessingKey(writeKey)) {
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
      // Clerk sends partial payloads. Convex deletes fields patched to
      // `undefined`, so an update carrying only the name would otherwise erase
      // the org's slug and avatar.
      await ctx.db.patch(existing._id, {
        name: args.name ?? existing.name,
        ...(args.slug !== undefined ? { slug: args.slug } : {}),
        ...(args.imageUrl !== undefined ? { imageUrl: args.imageUrl } : {}),
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
