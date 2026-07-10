/**
 * Plan tiers and hard quotas for SaaS entitlements.
 *
 * Effective plan comes from Dodo Payments (org billing row) or
 * `KYMA_ORG_PLAN_OVERRIDE` — see `lib/auth/entitlements.ts`.
 */

import type { OrgPlanTier } from '@/lib/billing/resolve-plan'

export type PlanQuotas = {
  /** Max candidates per screening batch create. */
  maxCandidatesPerBatch: number
  /** Max screening batches created per rolling 30 days (soft product cap). */
  maxBatchesPer30Days: number
  /** Max active invites (status created/opened/in_progress) per org. */
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

export class PlanQuotaExceededError extends Error {
  readonly code = 'PLAN_QUOTA_EXCEEDED' as const
  readonly plan: OrgPlanTier
  readonly limit: keyof PlanQuotas
  readonly attempted: number
  readonly max: number

  constructor(
    plan: OrgPlanTier,
    limit: keyof PlanQuotas,
    attempted: number,
    max: number
  ) {
    super(
      `Organization plan "${plan}" allows at most ${max} for ${limit} (attempted ${attempted}). Upgrade or contact support.`
    )
    this.name = 'PlanQuotaExceededError'
    this.plan = plan
    this.limit = limit
    this.attempted = attempted
    this.max = max
  }
}

export function assertCandidatesPerBatch(
  plan: OrgPlanTier,
  candidateCount: number
): void {
  const max = quotasForPlan(plan).maxCandidatesPerBatch
  if (candidateCount > max) {
    throw new PlanQuotaExceededError(
      plan,
      'maxCandidatesPerBatch',
      candidateCount,
      max
    )
  }
}
