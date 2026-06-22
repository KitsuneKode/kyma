import {
  DEFAULT_HARD_GATE_DIMENSIONS,
  isDefaultHardGateDimension,
} from '@/lib/rubric/constants'
import { computeWeightedScoreFromDimensions } from '@/lib/ui/score-format'

export const HARD_GATE_SCORE_THRESHOLD = 2

export const RECOMMENDATION_THRESHOLDS = {
  strongYes: 4.25,
  yes: 3.45,
  mixed: 2.75,
  lowConfidenceMixed: 3.7,
} as const

export type Recommendation = 'strong_yes' | 'yes' | 'mixed' | 'no'

export type Confidence = 'high' | 'medium' | 'low'

export function isHardGateDimension(dimension: string) {
  return isDefaultHardGateDimension(dimension)
}

export function isHardGateTriggered(
  dimensionScores: Array<{ dimension: string; score: number }>
) {
  return dimensionScores.some(
    (item) =>
      isHardGateDimension(item.dimension) &&
      item.score <= HARD_GATE_SCORE_THRESHOLD
  )
}

export function resolveRecommendation(input: {
  weightedScore: number
  confidence: Confidence
  hardGateTriggered: boolean
}): Recommendation {
  if (input.hardGateTriggered) {
    return 'no'
  }

  if (input.confidence === 'low') {
    return input.weightedScore >= RECOMMENDATION_THRESHOLDS.lowConfidenceMixed
      ? 'mixed'
      : 'no'
  }

  if (input.weightedScore >= RECOMMENDATION_THRESHOLDS.strongYes) {
    return 'strong_yes'
  }
  if (input.weightedScore >= RECOMMENDATION_THRESHOLDS.yes) {
    return 'yes'
  }
  if (input.weightedScore >= RECOMMENDATION_THRESHOLDS.mixed) {
    return 'mixed'
  }

  return 'no'
}

export function computeAssessmentWeightedScore(
  dimensionScores: Array<{ dimension: string; score: number }>,
  weights: Record<string, number>
) {
  const totalWeight = Object.values(weights).reduce(
    (sum, weight) => sum + weight,
    0
  )
  if (totalWeight <= 0) {
    return computeWeightedScoreFromDimensions(dimensionScores) ?? 0
  }

  const weightedRaw = dimensionScores.reduce((total, item, index) => {
    const definitionWeight =
      weights[item.dimension] ??
      weights[dimensionScores[index]?.dimension ?? ''] ??
      0
    const normalizedWeight = definitionWeight / totalWeight
    return total + item.score * normalizedWeight
  }, 0)

  return Number(weightedRaw.toFixed(2))
}

export { DEFAULT_HARD_GATE_DIMENSIONS }
