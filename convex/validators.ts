import { v } from 'convex/values'

import { literalUnion } from '../lib/domain/convex-literals'
import {
  JOB_FAMILIES,
  PRACTICE_JOB_FAMILIES,
  SIMULATION_MODES,
} from '../lib/domain/job-families'
import {
  CONFIDENCE_LEVELS,
  RECOMMENDATIONS,
} from '../lib/domain/recommendation'
export { reviewDecisionValidator } from '../lib/domain/review-decision'
import { REPORT_STATUSES } from '../lib/domain/report-status'
import { SESSION_STATES } from '../lib/domain/session-states'
import { SESSION_PURPOSES } from '../lib/interview/session-purpose'
import {
  CANDIDATE_RECOMMENDATION_FILTERS,
  CANDIDATE_STATUS_FILTERS,
} from '../lib/recruiter/candidate-queue-filters'
import { RUBRIC_DIMENSIONS } from '../lib/rubric/constants'

export const recommendationValidator = literalUnion(RECOMMENDATIONS)

export const confidenceValidator = literalUnion(CONFIDENCE_LEVELS)

export const reportStatusValidator = literalUnion(REPORT_STATUSES)

export const rubricDimensionValidator = literalUnion(RUBRIC_DIMENSIONS)

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

export const interviewSessionStateValidator = literalUnion(SESSION_STATES)

export const interviewStyleModeValidator = v.union(
  v.literal('standard'),
  v.literal('intensive')
)

export const sessionPurposeValidator = literalUnion(SESSION_PURPOSES)

export const jobFamilyValidator = literalUnion(JOB_FAMILIES)

/** Practice packs exclude `custom` — matches PRACTICE_PACKS job families. */
export const practiceJobFamilyValidator = literalUnion(PRACTICE_JOB_FAMILIES)

export const simulationModeValidator = literalUnion(SIMULATION_MODES)

export const candidateStatusFilterValidator = literalUnion(
  CANDIDATE_STATUS_FILTERS
)

export const candidateRecommendationFilterValidator = literalUnion(
  CANDIDATE_RECOMMENDATION_FILTERS
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
