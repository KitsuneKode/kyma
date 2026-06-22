// @vitest-environment edge-runtime
/// <reference types="vite/client" />

process.env.KYMA_PROCESSING_WRITE_KEY = 'test-processing-key'

import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'

import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'
import { seedInterview } from './lib/testSeed'

const modules = import.meta.glob('./**/*.ts')

const STUCK_AGE_MS = 20 * 60 * 1000
const GIVE_UP_AGE_MS = 2 * 60 * 60 * 1000

function harness() {
  return convexTest(schema, modules)
}

async function insertReport(
  t: ReturnType<typeof harness>,
  sessionId: Id<'interviewSessions'>,
  orgId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'manual_review'
) {
  await t.run((ctx) =>
    ctx.db.insert('assessmentReports', {
      orgId,
      sessionId,
      status,
      generatedAt: new Date().toISOString(),
    })
  )
}

describe('reapStuckProcessingSessions', () => {
  test('reconciles a stuck session whose report already completed', async () => {
    const t = harness()
    const { sessionId, orgId } = await seedInterview(t, {
      roomName: 'reap-completed',
      sessionState: 'processing',
      endedAt: new Date(Date.now() - STUCK_AGE_MS).toISOString(),
    })
    await insertReport(t, sessionId, orgId, 'completed')

    const result = await t.mutation(
      internal.processingReaper.reapStuckProcessingSessions,
      {}
    )

    expect(result.reconciled).toBe(1)
    const session = await t.run((ctx) => ctx.db.get(sessionId))
    expect(session?.state).toBe('completed')
  })

  test('fails a session that exceeded the give-up window with no terminal report', async () => {
    const t = harness()
    const { sessionId } = await seedInterview(t, {
      roomName: 'reap-giveup',
      sessionState: 'processing',
      endedAt: new Date(Date.now() - GIVE_UP_AGE_MS).toISOString(),
    })

    const result = await t.mutation(
      internal.processingReaper.reapStuckProcessingSessions,
      {}
    )

    expect(result.failed).toBe(1)
    const session = await t.run((ctx) => ctx.db.get(sessionId))
    expect(session?.state).toBe('failed')
    expect(session?.failureReason).toBe('processing-timeout')

    const report = await t.run((ctx) =>
      ctx.db
        .query('assessmentReports')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .first()
    )
    expect(report?.status).toBe('failed')
  })

  test('leaves a freshly processing session untouched', async () => {
    const t = harness()
    const { sessionId } = await seedInterview(t, {
      roomName: 'reap-fresh',
      sessionState: 'processing',
      endedAt: new Date().toISOString(),
    })

    const result = await t.mutation(
      internal.processingReaper.reapStuckProcessingSessions,
      {}
    )

    expect(result.scanned).toBe(1)
    expect(result.reconciled).toBe(0)
    expect(result.failed).toBe(0)
    expect(result.reEnqueued).toBe(0)

    const session = await t.run((ctx) => ctx.db.get(sessionId))
    expect(session?.state).toBe('processing')
  })
})
