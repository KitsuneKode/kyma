import { describe, expect, test } from 'vitest'

import {
  RECOMMENDATION_THRESHOLDS,
  resolveRecommendation,
} from '@/lib/assessment/scoring-policy'
import {
  JOB_FAMILIES,
  JOB_FAMILY_LABELS,
  PRACTICE_JOB_FAMILIES,
  isPracticeJobFamily,
} from '@/lib/domain/job-families'
import { CONFIDENCE_LEVELS, RECOMMENDATIONS } from '@/lib/domain/recommendation'
import { REPORT_STATUSES } from '@/lib/domain/report-status'
import {
  REVIEW_DECISION_LABELS,
  REVIEW_DECISIONS,
} from '@/lib/domain/review-decision'
import { SESSION_STATES } from '@/lib/domain/session-states'
import { SESSION_PURPOSES } from '@/lib/interview/session-purpose'
import { isCompletedPipelineStatus } from '@/lib/candidate/status-filters'
import {
  CANDIDATE_RECOMMENDATION_FILTERS,
  CANDIDATE_STATUS_FILTERS,
} from '@/lib/recruiter/candidate-queue-filters'

describe('domain source-of-truth contracts', () => {
  test('review decisions expose stable labels for every literal', () => {
    for (const decision of REVIEW_DECISIONS) {
      expect(REVIEW_DECISION_LABELS[decision]).toMatch(/\S/)
    }
  })

  test('session states and purposes stay non-empty const arrays', () => {
    expect(SESSION_STATES.length).toBeGreaterThan(0)
    expect(SESSION_PURPOSES).toEqual(['screening', 'demo', 'mock'])
  })

  test('job family labels cover every family and practice excludes custom', () => {
    for (const family of JOB_FAMILIES) {
      expect(JOB_FAMILY_LABELS[family]).toMatch(/\S/)
    }
    expect(PRACTICE_JOB_FAMILIES).not.toContain('custom')
    expect(isPracticeJobFamily('software_engineering')).toBe(true)
    expect(isPracticeJobFamily('custom')).toBe(false)
  })

  test('recommendation, confidence, and report status arrays stay stable', () => {
    expect([...RECOMMENDATIONS]).toEqual(['strong_yes', 'yes', 'mixed', 'no'])
    expect([...CONFIDENCE_LEVELS]).toEqual(['high', 'medium', 'low'])
    expect(REPORT_STATUSES).toContain('manual_review')
  })

  test('candidate queue filters include all recommendation literals', () => {
    expect(CANDIDATE_STATUS_FILTERS[0]).toBe('all')
    for (const recommendation of RECOMMENDATIONS) {
      expect(CANDIDATE_RECOMMENDATION_FILTERS).toContain(recommendation)
    }
  })

  test('recommendation policy respects hard-gate override', () => {
    expect(
      resolveRecommendation({
        weightedScore: 5,
        confidence: 'high',
        hardGateTriggered: true,
      })
    ).toBe('no')
  })

  test('recommendation policy uses documented thresholds', () => {
    expect(
      resolveRecommendation({
        weightedScore: RECOMMENDATION_THRESHOLDS.strongYes,
        confidence: 'high',
        hardGateTriggered: false,
      })
    ).toBe('strong_yes')
  })

  test('candidate status filters accept completed pipeline states', () => {
    expect(isCompletedPipelineStatus('completed')).toBe(true)
    expect(isCompletedPipelineStatus('submitted')).toBe(true)
    expect(isCompletedPipelineStatus('processing')).toBe(true)
    expect(isCompletedPipelineStatus('draft')).toBe(false)
  })
})
