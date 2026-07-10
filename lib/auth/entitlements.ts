/**
 * Org plan tiers for SaaS entitlements.
 *
 * Plan resolution priority:
 * 1. `KYMA_ORG_PLAN_OVERRIDE` (manual / design-partner)
 * 2. Org billing row synced from Dodo Payments webhooks
 * 3. Default `free`
 */

import { auth } from '@clerk/nextjs/server'
import { fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import {
  DEFAULT_ORG_PLAN,
  isOrgPlanTier,
  ORG_PLAN_TIERS,
  resolveEffectiveOrgPlan,
  type OrgPlanTier,
} from '@/lib/billing/resolve-plan'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { serverEnv } from '@/lib/env/server'

export { DEFAULT_ORG_PLAN, isOrgPlanTier, ORG_PLAN_TIERS, type OrgPlanTier }

export type OrgEntitlementFeature =
  | 'recruiter:ai-report-chat'
  | 'recruiter:premium-screening'
  | 'recruiter:advanced-analytics'
  | 'recruiter:byok'

/** Features available on each plan. Higher tiers include lower-tier features. */
export const FEATURE_ALLOWED_PLANS: Record<
  OrgEntitlementFeature,
  readonly OrgPlanTier[]
> = {
  // Keep report chat on free so the current recruiter product path stays usable.
  'recruiter:ai-report-chat': ['free', 'pro', 'enterprise'],
  'recruiter:premium-screening': ['pro', 'enterprise'],
  'recruiter:advanced-analytics': ['enterprise'],
  // Workspace BYOK keys: pro+ (free can still use platform keys).
  'recruiter:byok': ['pro', 'enterprise'],
} as const

/**
 * Resolve the effective org plan from an explicit override / billing snapshot.
 */
export function resolveOrgPlan(
  override: string | undefined | null = undefined,
  billing?: { plan?: string | null; status?: string | null } | null
): OrgPlanTier {
  if (!billing) {
    return resolveEffectiveOrgPlan({ override })
  }

  const rawPlan = billing.plan
  const plan: OrgPlanTier =
    typeof rawPlan === 'string' && isOrgPlanTier(rawPlan)
      ? rawPlan
      : DEFAULT_ORG_PLAN

  return resolveEffectiveOrgPlan({
    override,
    billing: {
      plan,
      status: billing.status,
    },
  })
}

export function orgPlanAllowsFeature(
  plan: OrgPlanTier,
  feature: OrgEntitlementFeature
): boolean {
  return FEATURE_ALLOWED_PLANS[feature].includes(plan)
}

export class OrgEntitlementDeniedError extends Error {
  readonly feature: OrgEntitlementFeature
  readonly plan: OrgPlanTier

  constructor(feature: OrgEntitlementFeature, plan: OrgPlanTier) {
    super(
      `Organization plan "${plan}" does not include entitlement "${feature}".`
    )
    this.name = 'OrgEntitlementDeniedError'
    this.feature = feature
    this.plan = plan
  }
}

async function loadBillingPlanForOrg(): Promise<{
  plan?: string | null
  status?: string | null
} | null> {
  try {
    const token = await getServerConvexAuthToken()
    if (!token) return null
    const billing = await fetchQuery(api.billing.getOrgBilling, {}, { token })
    return { plan: billing.plan, status: billing.status }
  } catch {
    return null
  }
}

/**
 * Central org-level entitlement gate.
 * Requires an active Clerk organization; denies features not on the current plan.
 */
export async function requireOrgEntitlement(feature: OrgEntitlementFeature) {
  const { orgId } = await auth()
  if (!orgId) {
    throw new Error('Active organization context is required.')
  }

  const billing = await loadBillingPlanForOrg()
  const plan = resolveOrgPlan(serverEnv.KYMA_ORG_PLAN_OVERRIDE, billing)
  if (!orgPlanAllowsFeature(plan, feature)) {
    throw new OrgEntitlementDeniedError(feature, plan)
  }

  return { orgId, allowed: true as const, plan }
}
