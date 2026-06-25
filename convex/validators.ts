import { v } from 'convex/values'

import { RUBRIC_DIMENSIONS } from '../lib/rubric/constants'

export { reviewDecisionValidator } from '../lib/domain/review-decision'

export const recommendationValidator = v.union(
  v.literal('strong_yes'),
  v.literal('yes'),
  v.literal('mixed'),
  v.literal('no')
)

export const confidenceValidator = v.union(
  v.literal('high'),
  v.literal('medium'),
  v.literal('low')
)

export const rubricDimensionValidator = v.union(
  ...(RUBRIC_DIMENSIONS.map((dimension) => v.literal(dimension)) as [
    ReturnType<typeof v.literal<(typeof RUBRIC_DIMENSIONS)[number]>>,
    ...ReturnType<typeof v.literal<(typeof RUBRIC_DIMENSIONS)[number]>>[],
  ])
)

/** Stored on assessment reports/evidence; supports custom template dimension names. */
export const scoringDimensionValidator = v.string()

export const modelOverridesValidator = v.object({
  stt: v.optional(v.string()),
  llm: v.optional(v.string()),
  tts: v.optional(v.string()),
  reviewChat: v.optional(v.string()),
  scoring: v.optional(v.string()),
})

export const workspaceProviderKeyValidator = v.object({
  keyId: v.string(),
  provider: v.string(),
  encryptedKey: v.string(),
  iv: v.string(),
  label: v.optional(v.string()),
  addedAt: v.number(),
  addedBy: v.string(),
  maskedKeyTail: v.optional(v.string()),
})

export const interviewSessionStateValidator = v.union(
  v.literal('created'),
  v.literal('ready'),
  v.literal('connecting'),
  v.literal('live'),
  v.literal('reconnecting'),
  v.literal('interrupted'),
  v.literal('processing'),
  v.literal('completed'),
  v.literal('failed')
)

export const interviewStyleModeValidator = v.union(
  v.literal('standard'),
  v.literal('intensive')
)

export const sessionPurposeValidator = v.union(
  v.literal('screening'),
  v.literal('demo'),
  v.literal('mock')
)

export const jobFamilyValidator = v.union(
  v.literal('tutor'),
  v.literal('software_engineering'),
  v.literal('product'),
  v.literal('sales'),
  v.literal('customer_support'),
  v.literal('general'),
  v.literal('custom')
)

/** Practice packs exclude `custom` — matches PRACTICE_PACKS job families. */
export const practiceJobFamilyValidator = v.union(
  v.literal('software_engineering'),
  v.literal('product'),
  v.literal('customer_support'),
  v.literal('sales'),
  v.literal('tutor'),
  v.literal('general')
)

export const simulationModeValidator = v.union(
  v.literal('teaching'),
  v.literal('roleplay'),
  v.literal('case_discussion'),
  v.literal('none')
)

export const interviewPolicySnapshotValidator = v.object({
  targetDurationMinutes: v.number(),
  allowsResume: v.boolean(),
  maxAttempts: v.number(),
  rubricVersion: v.string(),
  templateId: v.string(),
  templateName: v.optional(v.string()),
  interviewStyleMode: v.optional(interviewStyleModeValidator),
})
