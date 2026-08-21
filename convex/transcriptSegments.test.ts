// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'

import schema from './schema'
import { seedInterview } from './lib/testSeed'
import { upsertTranscriptSegmentForSession } from './helpers/transcriptSegments'

const modules = import.meta.glob('./**/*.ts')

function harness() {
  return convexTest(schema, modules)
}

async function segmentsFor(
  t: ReturnType<typeof harness>,
  sessionId: Awaited<ReturnType<typeof seedInterview>>['sessionId']
) {
  return await t.run((ctx) =>
    ctx.db
      .query('transcriptSegments')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
      .collect()
  )
}

describe('transcript segment upsert', () => {
  test('an utterance streamed as partials collapses to one row', async () => {
    const t = harness()
    const { sessionId } = await seedInterview(t, { roomName: 'room-partials' })

    // Mirrors the agent: one segment id held open across every partial, then
    // reused for the final.
    await t.run(async (ctx) => {
      for (const [text, status] of [
        ['I would', 'partial'],
        ['I would start', 'partial'],
        ['I would start with a simple example', 'final'],
      ] as const) {
        await upsertTranscriptSegmentForSession(ctx, {
          sessionId,
          segmentId: 'candidate:1000',
          speaker: 'candidate',
          text,
          status,
          startedAt: '2026-08-21T10:00:00.000Z',
        })
      }
    })

    const rows = await segmentsFor(t, sessionId)

    expect(rows).toHaveLength(1)
    expect(rows[0]?.status).toBe('final')
    expect(rows[0]?.text).toBe('I would start with a simple example')
  })

  test('separate utterances produce separate rows', async () => {
    const t = harness()
    const { sessionId } = await seedInterview(t, {
      roomName: 'room-utterances',
    })

    await t.run(async (ctx) => {
      for (let index = 0; index < 5; index += 1) {
        await upsertTranscriptSegmentForSession(ctx, {
          sessionId,
          segmentId: `candidate:${index}`,
          speaker: 'candidate',
          text: `turn ${index}`,
          status: 'final',
          startedAt: `2026-08-21T10:0${index}:00.000Z`,
        })
      }
    })

    expect(await segmentsFor(t, sessionId)).toHaveLength(5)
  })

  test('agent and candidate speech at the same instant stay distinct', async () => {
    const t = harness()
    const { sessionId } = await seedInterview(t, { roomName: 'room-speakers' })
    const startedAt = '2026-08-21T10:00:00.000Z'

    await t.run(async (ctx) => {
      await upsertTranscriptSegmentForSession(ctx, {
        sessionId,
        segmentId: 'candidate:1',
        speaker: 'candidate',
        text: 'candidate line',
        status: 'final',
        startedAt,
      })
      await upsertTranscriptSegmentForSession(ctx, {
        sessionId,
        segmentId: 'agent:1',
        speaker: 'agent',
        text: 'agent line',
        status: 'final',
        startedAt,
      })
    })

    const rows = await segmentsFor(t, sessionId)
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.speaker).toSorted()).toEqual([
      'agent',
      'candidate',
    ])
  })

  test('a long session does not accumulate duplicate rows', async () => {
    const t = harness()
    const { sessionId } = await seedInterview(t, { roomName: 'room-long' })

    // 40 utterances x 3 partials each. Before coalescing this produced 120
    // rows; it must now produce exactly 40.
    await t.run(async (ctx) => {
      for (let turn = 0; turn < 40; turn += 1) {
        const startedAt = new Date(
          Date.UTC(2026, 7, 21, 10, 0, turn)
        ).toISOString()
        for (const status of ['partial', 'partial', 'final'] as const) {
          await upsertTranscriptSegmentForSession(ctx, {
            sessionId,
            segmentId: `candidate:${turn}`,
            speaker: 'candidate',
            text: `turn ${turn} ${status}`,
            status,
            startedAt,
          })
        }
      }
    })

    expect(await segmentsFor(t, sessionId)).toHaveLength(40)
  })
})
