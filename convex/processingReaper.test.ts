// @vitest-environment edge-runtime
/// <reference types="vite/client" />

process.env.KYMA_PROCESSING_WRITE_KEY = 'test-processing-key'

import { convexTest } from 'convex-test'
import { beforeEach, describe, expect, test } from 'vitest'

import { internal, api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'
import { STALE_SESSION_MS } from './helpers/sessionOps'
import { seedInterview } from './lib/testSeed'

const modules = import.meta.glob('./**/*.ts')

const PROCESSING_KEY = 'test-processing-key'

const STUCK_AGE_MS = 20 * 60 * 1000
const GIVE_UP_AGE_MS = 2 * 60 * 60 * 1000
const STALE_AGE_MS = STALE_SESSION_MS + 60_000

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

describe('reapStalePreProcessingSessions', () => {
  test('finalizes a stale live session into processing', async () => {
    const t = harness()
    const { sessionId } = await seedInterview(t, {
      roomName: 'stale-live',
      sessionState: 'live',
      startedAt: new Date(Date.now() - STALE_AGE_MS).toISOString(),
    })

    const result = await t.mutation(
      internal.processingReaper.reapStalePreProcessingSessions,
      {}
    )

    expect(result.finalized).toBeGreaterThanOrEqual(1)
    const session = await t.run((ctx) => ctx.db.get(sessionId))
    expect(session?.state).toBe('processing')
  })

  test('finalizes a stale connecting session via interrupted → processing', async () => {
    const t = harness()
    const { sessionId } = await seedInterview(t, {
      roomName: 'stale-connecting',
      sessionState: 'connecting',
      startedAt: new Date(Date.now() - STALE_AGE_MS).toISOString(),
    })

    const result = await t.mutation(
      internal.processingReaper.reapStalePreProcessingSessions,
      {}
    )

    expect(result.finalized).toBeGreaterThanOrEqual(1)
    const session = await t.run((ctx) => ctx.db.get(sessionId))
    expect(session?.state).toBe('processing')
  })

  test('leaves a fresh live session untouched', async () => {
    const t = harness()
    const { sessionId } = await seedInterview(t, {
      roomName: 'fresh-live',
      sessionState: 'live',
      startedAt: new Date().toISOString(),
    })

    const result = await t.mutation(
      internal.processingReaper.reapStalePreProcessingSessions,
      {}
    )

    expect(result.finalized).toBe(0)
    expect(result.failed).toBe(0)
    const session = await t.run((ctx) => ctx.db.get(sessionId))
    expect(session?.state).toBe('live')
  })
})

describe('getStuckProcessingSummary', () => {
  beforeEach(() => {
    process.env.KYMA_PROCESSING_WRITE_KEY = PROCESSING_KEY
  })

  test('reports stuck sessions and recent reaper failures', async () => {
    const t = harness()
    await seedInterview(t, {
      roomName: 'summary-stuck',
      sessionState: 'processing',
      endedAt: new Date(Date.now() - STUCK_AGE_MS).toISOString(),
    })

    await t.run(async (ctx) => {
      const templateId = await ctx.db.insert('assessmentTemplates', {
        orgId: 'org_test',
        name: 'Failed template',
        role: 'tutor',
        status: 'active',
        createdBy: 'seed',
        rubricVersion: 'v1',
      })
      const inviteId = await ctx.db.insert('candidateInvites', {
        orgId: 'org_test',
        inviteToken: 'failed-invite',
        templateId,
        status: 'completed',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      await ctx.db.insert('interviewSessions', {
        orgId: 'org_test',
        inviteId,
        state: 'failed',
        provider: 'livekit',
        failureReason: 'processing-timeout',
        endedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      })
    })

    const summary = await t.query(
      api.processingReaper.getStuckProcessingSummary,
      {
        processingKey: PROCESSING_KEY,
      }
    )

    expect(summary.stuckCount).toBeGreaterThanOrEqual(1)
    expect(summary.recentReaperFailures).toBeGreaterThanOrEqual(1)
    expect(summary.thresholdMinutes).toBe(10)
  })
})
