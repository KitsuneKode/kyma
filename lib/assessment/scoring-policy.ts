import {
  DEFAULT_HARD_GATE_DIMENSIONS,
  isDefaultHardGateDimension,
} from '@/lib/rubric/constants'
import { computeWeightedScoreFromDimensions } from '@/lib/ui/score-format'
import type { ResolvedRubricDimension } from '@/lib/rubric/resolve-rubric'

export const HARD_GATE_SCORE_THRESHOLD = 2

export const RECOMMENDATION_THRESHOLDS = {
  strongYes: 4.25,
  yes: 3.45,
  mixed: 2.75,
  lowConfidenceMixed: 3.7,
} as const

export {
  CONFIDENCE_LEVELS,
  RECOMMENDATIONS,
  type Confidence,
  type Recommendation,
} from '@/lib/domain/recommendation'

import type { Confidence, Recommendation } from '@/lib/domain/recommendation'

/**
 * Whether a dimension gates the whole assessment.
 *
 * When an explicit rubric is supplied it is authoritative — including its
 * ability to clear a gate that is on by default, and to gate a custom dimension
 * the built-in list has never heard of. The default list applies only when no
 * rubric was resolved at all.
 */
export function isHardGateDimension(
  dimension: string,
  dimensions?: ResolvedRubricDimension[]
) {
  if (dimensions) {
    return dimensions.some((item) => item.name === dimension && item.isHardGate)
  }

  return isDefaultHardGateDimension(dimension)
}

export function isHardGateTriggered(
  dimensionScores: Array<{ dimension: string; score: number }>,
  dimensions?: ResolvedRubricDimension[]
) {
  return dimensionScores.some(
    (item) =>
      isHardGateDimension(item.dimension, dimensions) &&
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

/**
 * Derives every headline number on a report from the dimension scores and the
 * template rubric.
 *
 * Both the deterministic engine and the LLM path go through here, so a
 * recruiter's configured weights and hard gates have arithmetic effect rather
 * than merely appearing in a prompt. The LLM's own self-reported score,
 * recommendation and gate flag are advisory only — they are cross-checked
 * against this result, never trusted as the answer.
 */
export function deriveAssessmentOutcome(args: {
  dimensionScores: Array<{ dimension: string; score: number }>
  dimensions: ResolvedRubricDimension[]
  confidence: Confidence
}): {
  weightedScore: number
  hardGateTriggered: boolean
  overallRecommendation: Recommendation
} {
  // Normalize over the dimensions actually scored, not every dimension in the
  // rubric. Dividing by the full rubric weight while summing only a subset
  // depresses the score toward 0 and would render a partial model response as
  // a near-reject rather than an incomplete one.
  const scoredDimensionNames = new Set(
    args.dimensionScores.map((item) => item.dimension)
  )
  const weights = Object.fromEntries(
    args.dimensions
      .filter((dimension) => scoredDimensionNames.has(dimension.name))
      .map((dimension) => [dimension.name, dimension.weight])
  )
  const weightedScore = computeAssessmentWeightedScore(
    args.dimensionScores,
    weights
  )
  const hardGateTriggered = isHardGateTriggered(
    args.dimensionScores,
    args.dimensions
  )

  return {
    weightedScore,
    hardGateTriggered,
    overallRecommendation: resolveRecommendation({
      weightedScore,
      confidence: args.confidence,
      hardGateTriggered,
    }),
  }
}
