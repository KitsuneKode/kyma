import { describe, expect, test } from 'vitest'

import {
  HARD_GATE_SCORE_THRESHOLD,
  RECOMMENDATION_THRESHOLDS,
  computeAssessmentWeightedScore,
  isHardGateTriggered,
  resolveRecommendation,
} from './scoring-policy'

describe('scoring-policy conservative boundaries', () => {
  test('hard gate forces no regardless of high weighted score', () => {
    expect(
      resolveRecommendation({
        weightedScore: 5,
        confidence: 'high',
        hardGateTriggered: true,
      })
    ).toBe('no')
  })

  test('low confidence never returns yes or strong_yes', () => {
    expect(
      resolveRecommendation({
        weightedScore: RECOMMENDATION_THRESHOLDS.strongYes,
        confidence: 'low',
        hardGateTriggered: false,
      })
    ).toBe('mixed')

    expect(
      resolveRecommendation({
        weightedScore: RECOMMENDATION_THRESHOLDS.lowConfidenceMixed - 0.01,
        confidence: 'low',
        hardGateTriggered: false,
      })
    ).toBe('no')
  })

  test('threshold edges map to documented recommendations', () => {
    expect(
      resolveRecommendation({
        weightedScore: RECOMMENDATION_THRESHOLDS.strongYes,
        confidence: 'high',
        hardGateTriggered: false,
      })
    ).toBe('strong_yes')

    expect(
      resolveRecommendation({
        weightedScore: RECOMMENDATION_THRESHOLDS.yes,
        confidence: 'medium',
        hardGateTriggered: false,
      })
    ).toBe('yes')

    expect(
      resolveRecommendation({
        weightedScore: RECOMMENDATION_THRESHOLDS.mixed,
        confidence: 'high',
        hardGateTriggered: false,
      })
    ).toBe('mixed')

    expect(
      resolveRecommendation({
        weightedScore: RECOMMENDATION_THRESHOLDS.mixed - 0.01,
        confidence: 'high',
        hardGateTriggered: false,
      })
    ).toBe('no')
  })

  test('isHardGateTriggered fires at or below threshold on hard-gate dims', () => {
    expect(
      isHardGateTriggered([
        { dimension: 'clarity', score: HARD_GATE_SCORE_THRESHOLD },
      ])
    ).toBe(true)

    expect(
      isHardGateTriggered([
        { dimension: 'clarity', score: HARD_GATE_SCORE_THRESHOLD + 1 },
      ])
    ).toBe(false)

    expect(isHardGateTriggered([{ dimension: 'warmth', score: 1 }])).toBe(false)
  })

  test('weighted score falls back when weights are empty', () => {
    const score = computeAssessmentWeightedScore(
      [{ dimension: 'clarity', score: 4 }],
      {}
    )
    expect(typeof score).toBe('number')
    expect(Number.isFinite(score)).toBe(true)
  })
})
