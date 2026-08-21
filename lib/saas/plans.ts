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
  /** Max metered interview minutes per calendar month. Caps vendor spend. */
  maxInterviewMinutesPerMonth: number
}

export const PLAN_QUOTAS: Record<OrgPlanTier, PlanQuotas> = {
  free: {
    maxCandidatesPerBatch: 10,
    maxBatchesPer30Days: 5,
    maxActiveInvites: 25,
    maxInterviewMinutesPerMonth: 120,
  },
  pro: {
    maxCandidatesPerBatch: 50,
    maxBatchesPer30Days: 50,
    maxActiveInvites: 500,
    maxInterviewMinutesPerMonth: 3_000,
  },
  enterprise: {
    maxCandidatesPerBatch: 200,
    maxBatchesPer30Days: 500,
    maxActiveInvites: 5_000,
    maxInterviewMinutesPerMonth: 40_000,
  },
} as const

export function quotasForPlan(plan: OrgPlanTier): PlanQuotas {
  return PLAN_QUOTAS[plan]
}
