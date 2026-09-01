import { describe, expect, test } from 'vitest'

import { deriveAssessmentOutcome, isHardGateTriggered } from './scoring-policy'

const rubric = [
  { name: 'domain_depth', weight: 3, isHardGate: true },
  { name: 'warmth', weight: 1, isHardGate: false },
]

describe('isHardGateTriggered with an explicit rubric', () => {
  test('gates on a custom dimension the default list does not know', () => {
    expect(
      isHardGateTriggered(
        [
          { dimension: 'domain_depth', score: 2 },
          { dimension: 'warmth', score: 5 },
        ],
        rubric
      )
    ).toBe(true)
  })

  test('does not gate on a dimension the template left ungated', () => {
    expect(
      isHardGateTriggered(
        [
          { dimension: 'domain_depth', score: 5 },
          { dimension: 'warmth', score: 1 },
        ],
        rubric
      )
    ).toBe(false)
  })

  test('a template can clear a default hard gate', () => {
    expect(
      isHardGateTriggered(
        [{ dimension: 'clarity', score: 1 }],
        [{ name: 'clarity', weight: 1, isHardGate: false }]
      )
    ).toBe(false)
  })

  test('falls back to default gates when no rubric is supplied', () => {
    expect(isHardGateTriggered([{ dimension: 'clarity', score: 2 }])).toBe(true)
  })

  test('the gate threshold is inclusive at 2 and clear at 3', () => {
    expect(
      isHardGateTriggered([{ dimension: 'domain_depth', score: 2 }], rubric)
    ).toBe(true)
    expect(
      isHardGateTriggered([{ dimension: 'domain_depth', score: 3 }], rubric)
    ).toBe(false)
  })
})

describe('deriveAssessmentOutcome', () => {
  test('weights actually move the score', () => {
    const heavyOnStrength = deriveAssessmentOutcome({
      dimensionScores: [
        { dimension: 'domain_depth', score: 5 },
        { dimension: 'warmth', score: 1 },
      ],
      dimensions: rubric,
      confidence: 'high',
    })

    // (5 * 3 + 1 * 1) / 4 = 4.0
    expect(heavyOnStrength.weightedScore).toBe(4)

    const evenWeights = deriveAssessmentOutcome({
      dimensionScores: [
        { dimension: 'domain_depth', score: 5 },
        { dimension: 'warmth', score: 1 },
      ],
      dimensions: [
        { name: 'domain_depth', weight: 1, isHardGate: true },
        { name: 'warmth', weight: 1, isHardGate: false },
      ],
      confidence: 'high',
    })

    // (5 * 1 + 1 * 1) / 2 = 3.0
    expect(evenWeights.weightedScore).toBe(3)
  })

  test('a hard gate forces no even with a strong weighted score', () => {
    const outcome = deriveAssessmentOutcome({
      dimensionScores: [
        { dimension: 'domain_depth', score: 2 },
        { dimension: 'warmth', score: 5 },
      ],
      dimensions: rubric,
      confidence: 'high',
    })

    expect(outcome.hardGateTriggered).toBe(true)
    expect(outcome.overallRecommendation).toBe('no')
  })

  test('low confidence caps the recommendation at mixed', () => {
    const outcome = deriveAssessmentOutcome({
      dimensionScores: [
        { dimension: 'domain_depth', score: 5 },
        { dimension: 'warmth', score: 5 },
      ],
      dimensions: rubric,
      confidence: 'low',
    })

    expect(outcome.overallRecommendation).toBe('mixed')
  })

  test('a strong ungated profile earns strong_yes', () => {
    const outcome = deriveAssessmentOutcome({
      dimensionScores: [
        { dimension: 'domain_depth', score: 5 },
        { dimension: 'warmth', score: 4 },
      ],
      dimensions: rubric,
      confidence: 'high',
    })

    expect(outcome.hardGateTriggered).toBe(false)
    expect(outcome.overallRecommendation).toBe('strong_yes')
  })

  test('the derived score always stays inside the 1-5 band', () => {
    for (const score of [1, 3, 5]) {
      const outcome = deriveAssessmentOutcome({
        dimensionScores: rubric.map((dimension) => ({
          dimension: dimension.name,
          score,
        })),
        dimensions: rubric,
        confidence: 'high',
      })

      expect(outcome.weightedScore).toBeGreaterThanOrEqual(1)
      expect(outcome.weightedScore).toBeLessThanOrEqual(5)
    }
  })
})
