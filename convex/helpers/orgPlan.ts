/**
 * Resolve org plan inside Convex (no Next.js serverEnv).
 * Priority: KYMA_ORG_PLAN_OVERRIDE → organizations.plan (Dodo) → free.
 *
 * Quotas and tier types live in shared lib modules — do not re-declare here.
 */

import type { QueryCtx, MutationCtx } from '../_generated/server'
import { convexEnv } from '../../lib/env/convex'
import {
  DEFAULT_ORG_PLAN,
  isOrgPlanTier,
  resolveEffectiveOrgPlan,
  type OrgPlanTier,
} from '../../lib/billing/resolve-plan'
import {
  PLAN_QUOTAS,
  quotasForPlan,
  type PlanQuotas,
} from '../../lib/saas/plans'

export {
  DEFAULT_ORG_PLAN,
  isOrgPlanTier,
  PLAN_QUOTAS,
  quotasForPlan,
  type OrgPlanTier,
  type PlanQuotas,
}

export function resolveOrgPlanFromEnv(
  override: string | undefined | null = convexEnv.KYMA_ORG_PLAN_OVERRIDE
): OrgPlanTier {
  return resolveEffectiveOrgPlan({ override })
}

/**
 * Prefer env override, then org billing row from Dodo webhooks.
 */
export async function resolveOrgPlanForOrg(
  ctx: QueryCtx | MutationCtx,
  clerkOrgId: string
): Promise<OrgPlanTier> {
  if (
    typeof convexEnv.KYMA_ORG_PLAN_OVERRIDE === 'string' &&
    isOrgPlanTier(convexEnv.KYMA_ORG_PLAN_OVERRIDE)
  ) {
    return resolveOrgPlanFromEnv()
  }

  const org = await ctx.db
    .query('organizations')
    .withIndex('by_clerk_org_id', (q) => q.eq('clerkOrgId', clerkOrgId))
    .unique()

  return resolveEffectiveOrgPlan({
    billing: org?.plan
      ? {
          plan: isOrgPlanTier(org.plan) ? org.plan : DEFAULT_ORG_PLAN,
          status: org.billingStatus ?? null,
        }
      : null,
  })
}
