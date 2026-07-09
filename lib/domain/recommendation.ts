export const RECOMMENDATIONS = ['strong_yes', 'yes', 'mixed', 'no'] as const

export type Recommendation = (typeof RECOMMENDATIONS)[number]

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const

export type Confidence = (typeof CONFIDENCE_LEVELS)[number]
