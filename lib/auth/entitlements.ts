import { auth } from '@clerk/nextjs/server'

import {
  assertOrgPlanAllowsFeature,
  DEFAULT_ORG_PLAN,
  FEATURE_ALLOWED_PLANS,
  isOrgPlanTier,
  ORG_PLAN_TIERS,
  OrgEntitlementDeniedError,
  orgPlanAllowsFeature,
  resolveOrgPlan,
  type OrgEntitlementFeature,
  type OrgPlanTier,
} from '@/lib/auth/entitlements-core'
import { serverEnv } from '@/lib/env/server'

export {
  DEFAULT_ORG_PLAN,
  FEATURE_ALLOWED_PLANS,
  isOrgPlanTier,
  ORG_PLAN_TIERS,
  OrgEntitlementDeniedError,
  orgPlanAllowsFeature,
  resolveOrgPlan,
  type OrgEntitlementFeature,
  type OrgPlanTier,
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

  const plan = assertOrgPlanAllowsFeature(
    feature,
    serverEnv.KYMA_ORG_PLAN_OVERRIDE
  )

  return { orgId, allowed: true as const, plan }
}
