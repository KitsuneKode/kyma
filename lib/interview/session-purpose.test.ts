import { describe, expect, it } from 'vitest'

import {
  maxActiveDurationMs,
  MOCK_INTERVIEW_DURATION_MINUTES,
  resolveSessionBudget,
  resolveSessionPurpose,
} from './session-purpose'

describe('session-purpose', () => {
  it('defaults unknown purposes to screening', () => {
    expect(resolveSessionPurpose(undefined)).toBe('screening')
    expect(resolveSessionPurpose(null)).toBe('screening')
  })

  it('applies tighter budgets to mock sessions', () => {
    const mockBudget = resolveSessionBudget('mock')
    const screeningBudget = resolveSessionBudget('screening')

    expect(mockBudget.maxDurationMinutes).toBe(MOCK_INTERVIEW_DURATION_MINUTES)
    expect(mockBudget.maxCandidateTurns).toBeLessThan(
      screeningBudget.maxCandidateTurns
    )
    expect(maxActiveDurationMs('mock')).toBe(
      MOCK_INTERVIEW_DURATION_MINUTES * 60_000
    )
  })
})
