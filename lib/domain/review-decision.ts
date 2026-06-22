import { v } from 'convex/values'

export const REVIEW_DECISIONS = [
  'advance',
  'reject',
  'manual_review',
  'hold',
] as const

export type ReviewDecision = (typeof REVIEW_DECISIONS)[number]

export const reviewDecisionValidator = v.union(
  v.literal('advance'),
  v.literal('reject'),
  v.literal('manual_review'),
  v.literal('hold')
)

export const REVIEW_DECISION_LABELS: Record<ReviewDecision, string> = {
  advance: 'Advance',
  reject: 'Reject',
  manual_review: 'Manual review',
  hold: 'Hold',
}
