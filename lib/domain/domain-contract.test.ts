import { describe, expect, test } from 'vitest'

import {
  RECOMMENDATION_THRESHOLDS,
  resolveRecommendation,
} from '@/lib/assessment/scoring-policy'
import {
  REVIEW_DECISION_LABELS,
  REVIEW_DECISIONS,
} from '@/lib/domain/review-decision'
import { isCompletedPipelineStatus } from '@/lib/candidate/status-filters'

describe('domain source-of-truth contracts', () => {
  test('review decisions expose stable labels for every literal', () => {
    for (const decision of REVIEW_DECISIONS) {
      expect(REVIEW_DECISION_LABELS[decision]).toMatch(/\S/)
    }
  })

  test('recommendation policy respects hard-gate override', () => {
    expect(
      resolveRecommendation({
        weightedScore: 5,
        confidence: 'high',
        hardGateTriggered: true,
      })
    ).toBe('no')
  })

  test('recommendation policy uses documented thresholds', () => {
    expect(
      resolveRecommendation({
        weightedScore: RECOMMENDATION_THRESHOLDS.strongYes,
        confidence: 'high',
        hardGateTriggered: false,
      })
    ).toBe('strong_yes')
  })

  test('candidate status filters accept completed pipeline states', () => {
    expect(isCompletedPipelineStatus('completed')).toBe(true)
    expect(isCompletedPipelineStatus('submitted')).toBe(true)
    expect(isCompletedPipelineStatus('processing')).toBe(true)
    expect(isCompletedPipelineStatus('draft')).toBe(false)
  })
})
