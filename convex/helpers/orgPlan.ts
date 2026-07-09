/**
 * Resolve org plan inside Convex (no Next.js serverEnv).
 * Mirrors `lib/auth/entitlements.resolveOrgPlan` for mutation-side quota checks.
 */

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
