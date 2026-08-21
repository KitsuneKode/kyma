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
  const configured = (rubricConfig?.dimensions ?? [])
    .map((dimension) => ({
      name: dimension.name.trim(),
      weight: dimension.weight,
      isHardGate: dimension.isHardGate,
    }))
    .filter((dimension) => dimension.name.length > 0)

  if (configured.length > 0) {
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
