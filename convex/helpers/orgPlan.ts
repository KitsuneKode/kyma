/**
 * Resolve org plan inside Convex (no Next.js serverEnv).
 * Priority: KYMA_ORG_PLAN_OVERRIDE → organizations.plan (Dodo) → free.
 */

import type { QueryCtx, MutationCtx } from '../_generated/server'
import { convexEnv } from '../../lib/env/convex'

export const ORG_PLAN_TIERS = ['free', 'pro', 'enterprise'] as const

export type OrgPlanTier = (typeof ORG_PLAN_TIERS)[number]

export const DEFAULT_ORG_PLAN: OrgPlanTier = 'free'

export function isOrgPlanTier(value: string): value is OrgPlanTier {
  return (ORG_PLAN_TIERS as readonly string[]).includes(value)
}

export function resolveOrgPlanFromEnv(
  override: string | undefined | null = convexEnv.KYMA_ORG_PLAN_OVERRIDE
): OrgPlanTier {
  if (typeof override === 'string' && isOrgPlanTier(override)) {
    return override
  }
  return DEFAULT_ORG_PLAN
}

/**
 * Prefer env override, then org billing row from Dodo webhooks.
 */
export async function resolveOrgPlanForOrg(
  ctx: QueryCtx | MutationCtx,
  clerkOrgId: string
): Promise<OrgPlanTier> {
  const fromEnv = resolveOrgPlanFromEnv()
  if (
    typeof convexEnv.KYMA_ORG_PLAN_OVERRIDE === 'string' &&
    isOrgPlanTier(convexEnv.KYMA_ORG_PLAN_OVERRIDE)
  ) {
    return fromEnv
  }

  const org = await ctx.db
    .query('organizations')
    .withIndex('by_clerk_org_id', (q) => q.eq('clerkOrgId', clerkOrgId))
    .unique()

  if (org?.plan && isOrgPlanTier(org.plan)) {
    return org.plan
  }

  return DEFAULT_ORG_PLAN
}

export type PlanQuotas = {
  maxCandidatesPerBatch: number
  maxBatchesPer30Days: number
  maxActiveInvites: number
}

export const PLAN_QUOTAS: Record<OrgPlanTier, PlanQuotas> = {
  free: {
    maxCandidatesPerBatch: 10,
    maxBatchesPer30Days: 5,
    maxActiveInvites: 25,
  },
  pro: {
    maxCandidatesPerBatch: 50,
    maxBatchesPer30Days: 50,
    maxActiveInvites: 500,
  },
  enterprise: {
    maxCandidatesPerBatch: 200,
    maxBatchesPer30Days: 500,
    maxActiveInvites: 5_000,
  },
} as const

export function quotasForPlan(plan: OrgPlanTier): PlanQuotas {
  return PLAN_QUOTAS[plan]
}
