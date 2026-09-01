import { describe, expect, it } from 'vitest'

import { PLAN_QUOTAS, quotasForPlan } from '@/lib/saas/plans'

describe('plan quotas', () => {
  it('exposes tighter free caps than pro/enterprise', () => {
    expect(quotasForPlan('free').maxCandidatesPerBatch).toBeLessThan(
      quotasForPlan('pro').maxCandidatesPerBatch
    )
    expect(PLAN_QUOTAS.enterprise.maxActiveInvites).toBeGreaterThan(
      PLAN_QUOTAS.pro.maxActiveInvites
    )
  })
})

describe('minutes quota', () => {
  it('every tier declares a monthly minutes cap', () => {
    for (const plan of ['free', 'pro', 'enterprise'] as const) {
      expect(quotasForPlan(plan).maxInterviewMinutesPerMonth).toBeGreaterThan(0)
    }
  })

  it('caps increase monotonically with tier', () => {
    expect(PLAN_QUOTAS.free.maxInterviewMinutesPerMonth).toBeLessThan(
      PLAN_QUOTAS.pro.maxInterviewMinutesPerMonth
    )
    expect(PLAN_QUOTAS.pro.maxInterviewMinutesPerMonth).toBeLessThan(
      PLAN_QUOTAS.enterprise.maxInterviewMinutesPerMonth
    )
  })
})
