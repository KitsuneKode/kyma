import { z } from 'zod'

import { RUBRIC_DIMENSIONS } from '../rubric/constants'

export type Recommendation = 'strong_yes' | 'yes' | 'mixed' | 'no'
export type Confidence = 'high' | 'medium' | 'low'

export const rubricDimensionSchema = z.enum(RUBRIC_DIMENSIONS)

export const recommendationSchema = z.enum(['strong_yes', 'yes', 'mixed', 'no'])

export const confidenceSchema = z.enum(['high', 'medium', 'low'])

export const rubricConfigSchema = z.object({
  dimensions: z.array(
    z.object({
      name: z.string(),
      weight: z.number(),
      isHardGate: z.boolean(),
      keywords: z.array(z.string()).optional(),
    })
  ),
})

export type RubricConfig = z.infer<typeof rubricConfigSchema>

export const llmEvidenceItemSchema = z.object({
  quote: z
    .string()
    .min(1)
    .describe('Exact or near-exact candidate quote from the transcript.'),
  rationale: z
    .string()
    .min(1)
    .describe('Why this quote supports the dimension score.'),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
})

export function resolveRubricDimensionNames(
  rubricConfig?: RubricConfig
): [string, ...string[]] {
  const configured = rubricConfig?.dimensions
    .map((dimension) => dimension.name.trim())
    .filter(Boolean)

  if (configured && configured.length > 0) {
    return configured as [string, ...string[]]
  }

  return [...RUBRIC_DIMENSIONS] as [string, ...string[]]
}

export function buildLlmAssessmentReportSchema(rubricConfig?: RubricConfig) {
  const dimensionNames = resolveRubricDimensionNames(rubricConfig)
  const dimensionSchema = z.enum(dimensionNames)

  const llmDimensionScoreSchema = z.object({
    dimension: dimensionSchema,
    score: z.number().int().min(1).max(5),
    rationale: z.string().min(1),
    evidence: z.array(llmEvidenceItemSchema).min(1).max(4),
  })

  return z.object({
    overallRecommendation: recommendationSchema,
    confidence: confidenceSchema,
    summary: z.string().min(1),
    weightedScore: z.number().min(1).max(5),
    hardGateTriggered: z.boolean(),
    topStrengths: z.array(z.string()).min(1).max(5),
    topConcerns: z.array(z.string()).min(1).max(5),
    transcriptQualityNote: z.string().optional(),
    needsManualReview: z.boolean(),
    dimensionScores: z.array(llmDimensionScoreSchema).min(1),
  })
}

export const llmAssessmentReportSchema = buildLlmAssessmentReportSchema()

export type LlmAssessmentReport = z.infer<typeof llmAssessmentReportSchema>
export type LlmDimensionScore = LlmAssessmentReport['dimensionScores'][number]
export type LlmEvidenceItem = z.infer<typeof llmEvidenceItemSchema>

export { isRubricDimension } from '../rubric/constants'

export function isRecommendation(value: string): value is Recommendation {
  return recommendationSchema.safeParse(value).success
}

export function isConfidence(value: string): value is Confidence {
  return confidenceSchema.safeParse(value).success
}
