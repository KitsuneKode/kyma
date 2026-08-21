// @vitest-environment edge-runtime
/// <reference types="vite/client" />

// Trusted-write key must be set before any Convex module imports the env shim.
process.env.KYMA_PROCESSING_WRITE_KEY = 'test-processing-key'

import { convexTest } from 'convex-test'
import { beforeEach, describe, expect, test } from 'vitest'

import { api } from './_generated/api'
import schema from './schema'
import { seedInterview } from './lib/testSeed'

const PROCESSING_KEY = 'test-processing-key'
const modules = import.meta.glob('./**/*.ts')

function harness() {
  return convexTest(schema, modules)
}

describe('assessment report status transitions', () => {
  beforeEach(() => {
    process.env.KYMA_PROCESSING_WRITE_KEY = PROCESSING_KEY
  })

  test('a late failure never downgrades a completed report', async () => {
    const t = harness()
    const { sessionId } = await seedInterview(t, {
      roomName: 'room-no-downgrade',
      sessionState: 'processing',
    })

    await t.mutation(api.processing.assessment.saveAssessmentReport, {
      processingKey: PROCESSING_KEY,
      sessionId,
      status: 'completed',
      summary: 'Scored successfully.',
      weightedScore: 4.1,
      overallRecommendation: 'yes',
      confidence: 'high',
    })

    // A straggler from an earlier, slower run reports failure afterwards.
    await t.mutation(api.processing.assessment.saveAssessmentReport, {
      processingKey: PROCESSING_KEY,
      sessionId,
      status: 'failed',
      summary: 'Straggler failure.',
    })

    const report = await t.run((ctx) =>
      ctx.db
        .query('assessmentReports')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .first()
    )

    expect(report?.status).toBe('completed')
    expect(report?.summary).toBe('Scored successfully.')
  })

  test('a late failure never downgrades a manual_review report', async () => {
    const t = harness()
    const { sessionId } = await seedInterview(t, {
      roomName: 'room-no-downgrade-manual',
      sessionState: 'processing',
    })

    await t.mutation(api.processing.assessment.saveAssessmentReport, {
      processingKey: PROCESSING_KEY,
      sessionId,
      status: 'manual_review',
      summary: 'Routed to a human reviewer.',
    })

    await t.mutation(api.processing.assessment.saveAssessmentReport, {
      processingKey: PROCESSING_KEY,
      sessionId,
      status: 'failed',
      summary: 'Straggler failure.',
    })

    const report = await t.run((ctx) =>
      ctx.db
        .query('assessmentReports')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .first()
    )

    expect(report?.status).toBe('manual_review')
  })

  test('a genuine rescore may still upgrade a manual_review report', async () => {
    const t = harness()
    const { sessionId } = await seedInterview(t, {
      roomName: 'room-upgrade-allowed',
      sessionState: 'processing',
    })

    await t.mutation(api.processing.assessment.saveAssessmentReport, {
      processingKey: PROCESSING_KEY,
      sessionId,
      status: 'manual_review',
      summary: 'Needs review.',
    })

    await t.mutation(api.processing.assessment.saveAssessmentReport, {
      processingKey: PROCESSING_KEY,
      sessionId,
      status: 'completed',
      summary: 'Reviewer confirmed.',
    })

    const report = await t.run((ctx) =>
      ctx.db
        .query('assessmentReports')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .first()
    )

    expect(report?.status).toBe('completed')
  })

  test('a first-ever failure is still recorded', async () => {
    const t = harness()
    const { sessionId } = await seedInterview(t, {
      roomName: 'room-first-failure',
      sessionState: 'processing',
    })

    await t.mutation(api.processing.assessment.saveAssessmentReport, {
      processingKey: PROCESSING_KEY,
      sessionId,
      status: 'failed',
      summary: 'Provider unavailable.',
    })

    const report = await t.run((ctx) =>
      ctx.db
        .query('assessmentReports')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .first()
    )

    expect(report?.status).toBe('failed')
  })
})
