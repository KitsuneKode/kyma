import { ConvexError, v } from 'convex/values'

import { internalMutation, mutation } from './_generated/server'
import { recruiterQuery } from './lib/customFunctions'
import { requireAdmin, requireOrgId } from './helpers/auth'
import { logAuditEvent } from './helpers/audit'
import { convexEnv } from '../lib/env/convex'
import { hasTrustedProcessingKey } from './helpers/processingAuth'
import {
  DEFAULT_ORG_PLAN,
  isOrgPlanTier,
  resolveOrgPlanForOrg,
  type OrgPlanTier,
} from './helpers/orgPlan'

const planValidator = v.union(
  v.literal('free'),
  v.literal('pro'),
  v.literal('enterprise')
)

function requireBillingWriteKey(writeKey: string) {
  if (!hasTrustedProcessingKey(writeKey)) {
    throw new ConvexError('Invalid write key for billing webhook sync.')
  }
}

export const getOrgBilling = recruiterQuery({
  args: {},
  returns: v.object({
    plan: planValidator,
    status: v.optional(v.string()),
    productId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    customerId: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    updatedAt: v.optional(v.number()),
    overrideActive: v.boolean(),
  }),
  handler: async (ctx) => {
    const { orgId } = ctx
    const org = await ctx.db
      .query('organizations')
      .withIndex('by_clerk_org_id', (q) => q.eq('clerkOrgId', orgId))
      .unique()

    const override = convexEnv.KYMA_ORG_PLAN_OVERRIDE
    const plan = await resolveOrgPlanForOrg(ctx, orgId)

    return {
      plan,
      status: org?.billingStatus,
      productId: org?.dodoProductId,
      subscriptionId: org?.dodoSubscriptionId,
      customerId: org?.dodoCustomerId,
      currentPeriodEnd: org?.billingCurrentPeriodEnd,
      cancelAtPeriodEnd: org?.billingCancelAtPeriodEnd,
      updatedAt: org?.billingUpdatedAt,
      overrideActive: Boolean(
        typeof override === 'string' && isOrgPlanTier(override)
      ),
    }
  },
})

/**
 * Server-only upsert from Dodo webhooks (processing write key).
 * Idempotent via billingWebhookEvents.eventKey.
 */
export const applyDodoSubscriptionEvent = mutation({
  args: {
    writeKey: v.string(),
    eventKey: v.string(),
    eventType: v.string(),
    clerkOrgId: v.string(),
    plan: planValidator,
    status: v.string(),
    customerId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    productId: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
  },
  returns: v.object({
    applied: v.boolean(),
    orgId: v.union(v.id('organizations'), v.null()),
    /** Discriminates a benign duplicate from a retryable unmirrored org. */
    reason: v.optional(
      v.union(v.literal('duplicate'), v.literal('org_not_mirrored'))
    ),
  }),
  handler: async (ctx, args) => {
    requireBillingWriteKey(args.writeKey)

    const existingEvent = await ctx.db
      .query('billingWebhookEvents')
      .withIndex('by_event_key', (q) => q.eq('eventKey', args.eventKey))
      .unique()
    if (existingEvent) {
      return { applied: false, orgId: null, reason: 'duplicate' as const }
    }

    const now = Date.now()

    const org = await ctx.db
      .query('organizations')
      .withIndex('by_clerk_org_id', (q) => q.eq('clerkOrgId', args.clerkOrgId))
      .unique()

    if (!org) {
      // Deliberately do NOT record the event. The org is not mirrored yet
      // (a subscription webhook can beat Clerk's organization.created), and
      // recording it would make the dedupe check above suppress every
      // redelivery - stranding the org on the wrong plan permanently.
      // Returning `applied: false` lets the route signal a retry.
      return {
        applied: false,
        orgId: null,
        reason: 'org_not_mirrored' as const,
      }
    }

    await ctx.db.insert('billingWebhookEvents', {
      eventKey: args.eventKey,
      eventType: args.eventType,
      clerkOrgId: args.clerkOrgId,
      subscriptionId: args.subscriptionId,
      processedAt: now,
    })

    const nextPlan: OrgPlanTier = isOrgPlanTier(args.plan)
      ? args.plan
      : DEFAULT_ORG_PLAN

    await ctx.db.patch(org._id, {
      plan: nextPlan,
      billingStatus: args.status,
      dodoCustomerId: args.customerId ?? org.dodoCustomerId,
      dodoSubscriptionId: args.subscriptionId ?? org.dodoSubscriptionId,
      dodoProductId: args.productId ?? org.dodoProductId,
      billingCurrentPeriodEnd:
        args.currentPeriodEnd ?? org.billingCurrentPeriodEnd,
      billingCancelAtPeriodEnd:
        args.cancelAtPeriodEnd ?? org.billingCancelAtPeriodEnd,
      billingUpdatedAt: now,
      updatedAt: now,
    })

    await logAuditEvent(ctx, {
      orgId: args.clerkOrgId,
      actorId: 'dodo-webhook',
      action: 'billing.subscription_synced',
      resource: `organizations:${org._id}`,
      metadata: {
        eventType: args.eventType,
        plan: nextPlan,
        status: args.status,
        subscriptionId: args.subscriptionId,
        productId: args.productId,
      },
    })

    return { applied: true, orgId: org._id }
  },
})

/** Link a Dodo customer id after checkout (recruiter admin). */
export const setDodoCustomerId = internalMutation({
  args: {
    clerkOrgId: v.string(),
    customerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query('organizations')
      .withIndex('by_clerk_org_id', (q) => q.eq('clerkOrgId', args.clerkOrgId))
      .unique()
    if (!org) return null
    await ctx.db.patch(org._id, {
      dodoCustomerId: args.customerId,
      billingUpdatedAt: Date.now(),
      updatedAt: Date.now(),
    })
    return null
  },
})

export const assertBillingAdmin = mutation({
  args: {},
  returns: v.object({ orgId: v.string() }),
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const orgId = await requireOrgId(ctx)
    return { orgId }
  },
})
