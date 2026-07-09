import { literalUnion } from './convex-literals'

export const REVIEW_DECISIONS = [
  'advance',
  'reject',
  'manual_review',
  'hold',
] as const

export type ReviewDecision = (typeof REVIEW_DECISIONS)[number]

export const reviewDecisionValidator = literalUnion(REVIEW_DECISIONS)

export const REVIEW_DECISION_LABELS: Record<ReviewDecision, string> = {
  advance: 'Advance',
  reject: 'Reject',
  manual_review: 'Manual review',
  hold: 'Hold',
}
