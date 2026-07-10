/**
 * Shared org plan resolution for Next.js and Convex.
 * Priority: KYMA_ORG_PLAN_OVERRIDE → active Dodo subscription plan → free.
 */

import {
  planFromDodoProductId,
  planFromSubscriptionStatus,
  type DodoProductConfig,
} from '@/lib/billing/plans'

export const ORG_PLAN_TIERS = ['free', 'pro', 'enterprise'] as const
export type OrgPlanTier = (typeof ORG_PLAN_TIERS)[number]
export const DEFAULT_ORG_PLAN: OrgPlanTier = 'free'

export function isOrgPlanTier(value: string): value is OrgPlanTier {
  return (ORG_PLAN_TIERS as readonly string[]).includes(value)
}

export type OrgBillingSnapshot = {
  plan: OrgPlanTier
  status?: string | null
  productId?: string | null
  subscriptionId?: string | null
  customerId?: string | null
  currentPeriodEnd?: number | null
  cancelAtPeriodEnd?: boolean | null
  updatedAt?: number | null
}

export function resolveEffectiveOrgPlan(args: {
  override?: string | null
  billing?: Pick<OrgBillingSnapshot, 'plan' | 'status'> | null
}): OrgPlanTier {
  if (typeof args.override === 'string' && isOrgPlanTier(args.override)) {
    return args.override
  }
  if (args.billing?.plan && isOrgPlanTier(args.billing.plan)) {
    // Webhook writes already store free when inactive. If status is present,
    // re-check; if missing, trust the stored plan.
    if (args.billing.status) {
      return planFromSubscriptionStatus(args.billing.status, args.billing.plan)
    }
    return args.billing.plan
  }
  return DEFAULT_ORG_PLAN
}

export function billingPlanFromSubscriptionEvent(args: {
  status: string
  productId?: string | null
  catalog: DodoProductConfig[]
}): OrgPlanTier {
  const productPlan = planFromDodoProductId(args.productId, args.catalog)
  return planFromSubscriptionStatus(args.status, productPlan)
}
