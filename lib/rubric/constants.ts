export const RUBRIC_DIMENSIONS = [
  'clarity',
  'simplification',
  'patience',
  'warmth',
  'listening',
  'fluency',
  'adaptability',
  'engagement',
  'accuracy',
] as const

export type RubricDimension = (typeof RUBRIC_DIMENSIONS)[number]

export const DIMENSION_LABELS: Record<RubricDimension, string> = {
  clarity: 'Clarity',
  simplification: 'Simplification',
  patience: 'Patience',
  warmth: 'Warmth',
  listening: 'Listening',
  fluency: 'Fluency',
  adaptability: 'Adaptability',
  engagement: 'Engagement',
  accuracy: 'Accuracy',
}

export const DIMENSION_WEIGHTS: Record<RubricDimension, number> = {
  clarity: 0.2,
  simplification: 0.14,
  patience: 0.14,
  warmth: 0.1,
  listening: 0.1,
  fluency: 0.1,
  adaptability: 0.08,
  engagement: 0.08,
  accuracy: 0.06,
}

export const DEFAULT_HARD_GATE_DIMENSIONS = [
  'clarity',
  'patience',
  'accuracy',
] as const satisfies readonly RubricDimension[]

export function isRubricDimension(value: string): value is RubricDimension {
  return (RUBRIC_DIMENSIONS as readonly string[]).includes(value)
}

export function isDefaultHardGateDimension(dimension: string): boolean {
  return (DEFAULT_HARD_GATE_DIMENSIONS as readonly string[]).includes(dimension)
}
