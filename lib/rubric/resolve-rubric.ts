import type { RubricConfig } from '@/lib/assessment/llm-report-schema'

import {
  DIMENSION_WEIGHTS,
  RUBRIC_DIMENSIONS,
  isDefaultHardGateDimension,
  isRubricDimension,
} from './constants'

export type ResolvedRubricDimension = {
  name: string
  weight: number
  isHardGate: boolean
}

/**
 * The single source of truth for what a rubric means at scoring time.
 *
 * Hard-gate and weight semantics were previously re-derived in three places -
 * the deterministic engine, the scoring policy, and the review chart - and they
 * disagreed, so a recruiter's configured gates had no effect while the UI still
 * advertised them. Everything now resolves through here.
 *
 * A template's configured dimensions win outright, including the ability to
 * clear a hard gate that is on by default. Only when no usable configuration
 * exists do the built-in nine dimensions apply.
 */
export function resolveRubricDimensions(
  rubricConfig?: RubricConfig
): ResolvedRubricDimension[] {
  // Duplicate names, negative weights and non-finite weights all corrupt the
  // weighted average: `Object.fromEntries` collapses duplicates in the
  // denominator while every row still contributes to the numerator, a negative
  // weight can push the score outside 1-5, and Infinity yields NaN (which
  // compares false against every threshold and silently becomes a reject).
  // Canonicalise here so no consumer has to defend against it.
  const seen = new Set<string>()
  const configured: ResolvedRubricDimension[] = []

  for (const dimension of rubricConfig?.dimensions ?? []) {
    const name = dimension.name.trim()
    if (!name || seen.has(name)) {
      continue
    }

    const weight = Number(dimension.weight)
    if (!Number.isFinite(weight) || weight < 0) {
      continue
    }

    seen.add(name)
    configured.push({ name, weight, isHardGate: dimension.isHardGate })
  }

  // A rubric whose weights all resolve to zero carries no weighting
  // information; fall through to the defaults rather than dividing by zero.
  if (configured.some((item) => item.weight > 0)) {
    return configured
  }

  return RUBRIC_DIMENSIONS.map((dimension) => ({
    name: dimension,
    weight: DIMENSION_WEIGHTS[dimension],
    isHardGate: isDefaultHardGateDimension(dimension),
  }))
}

export function hardGateNamesFrom(
  dimensions: ResolvedRubricDimension[]
): string[] {
  return dimensions
    .filter((dimension) => dimension.isHardGate)
    .map((dimension) => dimension.name)
}

export { isRubricDimension }

/**
 * Whether a dimension is starred as a hard gate in the review UI.
 *
 * `hardGateDimensions` comes from the report and records the rubric that was
 * in force at scoring time, so it is authoritative when present - including an
 * empty array, which means "this rubric gates nothing". The default list is a
 * fallback only for reports written before the field was persisted. Both the
 * radar and the bar chart must use this, or the same report shows different
 * gates in two places on one screen.
 */
export function isReportHardGateDimension(
  dimension: string,
  hardGateDimensions?: string[]
): boolean {
  if (hardGateDimensions) {
    return hardGateDimensions.includes(dimension)
  }
  return isDefaultHardGateDimension(dimension)
}
