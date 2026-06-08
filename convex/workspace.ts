import { ConvexError } from 'convex/values'

import { mutation } from './_generated/server'
import {
  clerkIdFromIdentity,
  ensureUserForIdentity,
} from './helpers/clerkIdentity'
import { getOrgContextFromIdentity } from './helpers/orgContext'

export const ensureCurrentWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError('You must be signed in to sync your workspace.')
    }

    await ensureUserForIdentity(ctx, identity)
    const clerkUserId = clerkIdFromIdentity(identity)
    const { orgId, orgRole, orgPermissions } = getOrgContextFromIdentity(
      identity as Record<string, unknown>
    )

    if (!orgId) {
      return {
        synced: false as const,
        reason: 'no_active_org' as const,
        clerkUserId,
      }
    }

    const now = Date.now()
    const existingOrg = await ctx.db
      .query('organizations')
      .withIndex('by_clerk_org_id', (q) => q.eq('clerkOrgId', orgId))
      .unique()

    if (!existingOrg) {
      await ctx.db.insert('organizations', {
        clerkOrgId: orgId,
        name: 'Organization',
        createdAt: now,
        updatedAt: now,
      })
    }

    const membershipId = `dev_sync:${orgId}:${clerkUserId}`
    const existingMembership = await ctx.db
      .query('orgMemberships')
      .withIndex('by_clerk_membership_id', (q) =>
        q.eq('clerkMembershipId', membershipId)
      )
      .unique()

    const membershipPatch = {
      clerkOrgId: orgId,
      clerkUserId,
      role: orgRole ?? 'org:admin',
      permissions:
        orgPermissions.length > 0 ? orgPermissions : ['org:recruiter:access'],
      updatedAt: now,
    }

    if (existingMembership) {
      await ctx.db.patch(existingMembership._id, membershipPatch)
    } else {
      await ctx.db.insert('orgMemberships', {
        clerkMembershipId: membershipId,
        ...membershipPatch,
        createdAt: now,
      })
    }

    const settings = await ctx.db
      .query('workspaceSettings')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .first()

    if (!settings) {
      await ctx.db.insert('workspaceSettings', {
        orgId,
        candidateReleaseMode: 'auto',
        defaultModels: {
          stt: 'deepgram/nova-3',
          llm: 'openai/gpt-4.1-mini',
          tts: 'cartesia/sonic',
          reviewChat: 'anthropic/claude-sonnet-4.6',
        },
        updatedAt: now,
        updatedBy: `user:${clerkUserId}`,
      })
    }

    return {
      synced: true as const,
      orgId,
      clerkUserId,
      orgRole: orgRole ?? 'org:admin',
    }
  },
})
