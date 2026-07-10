import { describe, expect, it } from 'vitest'

import {
  PLAN_QUOTAS,
  PlanQuotaExceededError,
  assertCandidatesPerBatch,
  quotasForPlan,
} from '@/lib/saas/plans'

describe('plan quotas', () => {
  it('exposes tighter free caps than pro/enterprise', () => {
    expect(quotasForPlan('free').maxCandidatesPerBatch).toBeLessThan(
      quotasForPlan('pro').maxCandidatesPerBatch
    )
    expect(PLAN_QUOTAS.enterprise.maxActiveInvites).toBeGreaterThan(
      PLAN_QUOTAS.pro.maxActiveInvites
    )
  })

  it('throws PlanQuotaExceededError when batch size exceeds plan', () => {
    expect(() => assertCandidatesPerBatch('free', 11)).toThrow(
      PlanQuotaExceededError
    )
    expect(() => assertCandidatesPerBatch('free', 10)).not.toThrow()
  })
})
