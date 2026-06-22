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

describe('ingestWebhookEvent session transitions', () => {
  beforeEach(() => {
    process.env.KYMA_PROCESSING_WRITE_KEY = PROCESSING_KEY
  })

  test('participant_joined moves connecting -> live and stamps the start time', async () => {
    const t = harness()
    const { sessionId, roomName } = await seedInterview(t, {
      roomName: 'room-join',
      sessionState: 'connecting',
    })

    await t.mutation(api.livekit.ingestWebhookEvent, {
      processingKey: PROCESSING_KEY,
      event: 'participant_joined',
      roomName,
      participantIdentity: 'candidate-1',
    })

    const session = await t.run((ctx) => ctx.db.get(sessionId))
    expect(session?.state).toBe('live')
    expect(session?.startedAt).toBeDefined()
    expect(session?.lastLiveStartedAt).toBeDefined()
  })

  test('candidate participant_left moves live -> interrupted and accrues active duration', async () => {
    const t = harness()
    const lastLiveStartedAt = new Date(Date.now() - 5000).toISOString()
    const { sessionId, roomName } = await seedInterview(t, {
      roomName: 'room-left',
      sessionState: 'live',
      startedAt: lastLiveStartedAt,
      lastLiveStartedAt,
    })

    await t.mutation(api.livekit.ingestWebhookEvent, {
      processingKey: PROCESSING_KEY,
      event: 'participant_left',
      roomName,
      participantIdentity: 'candidate-1',
    })

    const session = await t.run((ctx) => ctx.db.get(sessionId))
    expect(session?.state).toBe('interrupted')
    expect(session?.activeDurationMs ?? 0).toBeGreaterThan(0)
    expect(session?.lastLiveStartedAt).toBeUndefined()
  })

  test('non-candidate participant_left does not change session state', async () => {
    const t = harness()
    const { sessionId, roomName } = await seedInterview(t, {
      roomName: 'room-agent-left',
      sessionState: 'live',
      startedAt: new Date().toISOString(),
    })

    await t.mutation(api.livekit.ingestWebhookEvent, {
      processingKey: PROCESSING_KEY,
      event: 'participant_left',
      roomName,
      participantIdentity: 'agent-1',
    })

    const session = await t.run((ctx) => ctx.db.get(sessionId))
    expect(session?.state).toBe('live')
  })

  test('an invalid processing key is rejected without mutating the session', async () => {
    const t = harness()
    const { sessionId, roomName } = await seedInterview(t, {
      roomName: 'room-bad-key',
      sessionState: 'connecting',
    })

    await expect(
      t.mutation(api.livekit.ingestWebhookEvent, {
        processingKey: 'wrong-key',
        event: 'participant_joined',
        roomName,
        participantIdentity: 'candidate-1',
      })
    ).rejects.toThrow(/processing key/i)

    const session = await t.run((ctx) => ctx.db.get(sessionId))
    expect(session?.state).toBe('connecting')
  })

  test('duplicate participant_joined events are deduped to a single transition', async () => {
    const t = harness()
    const { sessionId, roomName } = await seedInterview(t, {
      roomName: 'room-dedupe',
      sessionState: 'connecting',
    })

    const payload = {
      processingKey: PROCESSING_KEY,
      event: 'participant_joined' as const,
      roomName,
      participantIdentity: 'candidate-1',
    }
    await t.mutation(api.livekit.ingestWebhookEvent, payload)
    await t.mutation(api.livekit.ingestWebhookEvent, payload)

    const events = await t.run((ctx) =>
      ctx.db
        .query('sessionEvents')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .collect()
    )
    expect(
      events.filter((event) => event.type === 'participant_joined')
    ).toHaveLength(1)
  })
})

describe('finalize -> report pipeline', () => {
  beforeEach(() => {
    process.env.KYMA_PROCESSING_WRITE_KEY = PROCESSING_KEY
  })

  test('room_finished finalizes a live session into processing and completes the invite', async () => {
    const t = harness()
    const { sessionId, inviteId, roomName } = await seedInterview(t, {
      roomName: 'room-finished',
      sessionState: 'live',
      startedAt: new Date(Date.now() - 10_000).toISOString(),
      lastLiveStartedAt: new Date(Date.now() - 10_000).toISOString(),
    })

    await t.mutation(api.livekit.ingestWebhookEvent, {
      processingKey: PROCESSING_KEY,
      event: 'room_finished',
      roomName,
    })

    const session = await t.run((ctx) => ctx.db.get(sessionId))
    expect(session?.state).toBe('processing')
    expect(session?.endedAt).toBeDefined()

    const invite = await t.run((ctx) => ctx.db.get(inviteId))
    expect(invite?.status).toBe('completed')

    const events = await t.run((ctx) =>
      ctx.db
        .query('sessionEvents')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .collect()
    )
    expect(events.some((event) => event.type === 'processing-started')).toBe(
      true
    )
  })

  test('a trusted pipeline write persists the assessment report for a finalized session', async () => {
    const t = harness()
    const { sessionId, roomName } = await seedInterview(t, {
      roomName: 'room-report',
      sessionState: 'live',
      startedAt: new Date(Date.now() - 10_000).toISOString(),
      lastLiveStartedAt: new Date(Date.now() - 10_000).toISOString(),
    })

    await t.mutation(api.livekit.ingestWebhookEvent, {
      processingKey: PROCESSING_KEY,
      event: 'room_finished',
      roomName,
    })

    await t.mutation(api.recruiter.reviews.saveAssessmentReport, {
      processingKey: PROCESSING_KEY,
      sessionId,
      status: 'completed',
      overallRecommendation: 'yes',
      confidence: 'high',
      summary: 'Solid communicator.',
      weightedScore: 78,
      scoringSource: 'deterministic',
    })

    const report = await t.run((ctx) =>
      ctx.db
        .query('assessmentReports')
        .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
        .first()
    )
    expect(report?.status).toBe('completed')
    expect(report?.overallRecommendation).toBe('yes')
    expect(report?.weightedScore).toBe(78)
  })
})
