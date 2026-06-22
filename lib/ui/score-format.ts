import { DIMENSION_WEIGHTS, isRubricDimension } from '@/lib/rubric/constants'

export type ScoreColorVariant = 'chip' | 'bar'

export type ScoringSource = 'llm' | 'deterministic'

type DimensionScoreInput = {
  dimension: string
  score: number
}

export function scoreColor(
  score: number | undefined,
  variant: ScoreColorVariant = 'chip'
): string {
  if (variant === 'bar') {
    if (score === undefined || !Number.isFinite(score)) {
      return 'hsl(var(--muted))'
    }
    if (score <= 2) return 'hsl(var(--destructive))'
    if (score <= 3) return 'hsl(38 92% 50%)'
    return 'hsl(142 71% 45%)'
  }

  if (score === undefined) return 'bg-muted/30 text-muted-foreground'
  if (score <= 2.0) return 'bg-red-500/15 text-red-700 dark:text-red-300'
  if (score <= 3.0) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
  if (score <= 4.0)
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold'
}

export function scoreTextColor(score: number): string {
  if (score <= 2.0) return 'text-red-500'
  if (score <= 3.0) return 'text-amber-500'
  return 'text-emerald-500'
}

export function scoreBandClass(score: number): string {
  if (score <= 2.0) return 'bg-red-500/15'
  if (score <= 3.0) return 'bg-amber-500/15'
  return 'bg-emerald-500/15'
}

export function computeWeightedScoreFromDimensions(
  dimensionScores: DimensionScoreInput[]
): number | null {
  if (!dimensionScores.length) return null

  const entries = dimensionScores.map((item) => ({
    weight: isRubricDimension(item.dimension)
      ? DIMENSION_WEIGHTS[item.dimension]
      : 0,
    score: item.score,
  }))
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0)

  const weightedRaw =
    totalWeight > 0
      ? entries.reduce(
          (sum, entry) => sum + entry.score * (entry.weight / totalWeight),
          0
        )
      : dimensionScores.reduce((sum, item) => sum + item.score, 0) /
        dimensionScores.length

  return Number(weightedRaw.toFixed(2))
}

/** Prefer stored weightedScore; fall back to rubric-weighted recompute. */
export function resolveOverallScore(
  weightedScore: number | undefined | null,
  dimensionScores?: DimensionScoreInput[]
): number | null {
  if (typeof weightedScore === 'number' && Number.isFinite(weightedScore)) {
    return weightedScore
  }

  if (dimensionScores?.length) {
    return computeWeightedScoreFromDimensions(dimensionScores)
  }

  return null
}

export function formatScoreValue(score: number | null | undefined): string {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return '—'
  }

  return score.toFixed(1)
}

export function formatScoringSourceLabel(
  source?: ScoringSource | null,
  modelId?: string | null
): string {
  if (!source) return 'Scoring pending'

  if (source === 'llm') {
    return modelId ? `LLM scored (${modelId})` : 'LLM scored'
  }

  return 'Deterministic scored'
}
