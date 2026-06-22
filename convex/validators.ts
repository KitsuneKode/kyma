import { v } from 'convex/values'

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
  v.literal('clarity'),
  v.literal('simplification'),
  v.literal('patience'),
  v.literal('warmth'),
  v.literal('listening'),
  v.literal('fluency'),
  v.literal('adaptability'),
  v.literal('engagement'),
  v.literal('accuracy')
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

export const interviewPolicySnapshotValidator = v.object({
  targetDurationMinutes: v.number(),
  allowsResume: v.boolean(),
  maxAttempts: v.number(),
  rubricVersion: v.string(),
  templateId: v.string(),
  templateName: v.optional(v.string()),
  interviewStyleMode: v.optional(interviewStyleModeValidator),
})
