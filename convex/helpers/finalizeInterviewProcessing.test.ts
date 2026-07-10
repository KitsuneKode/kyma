// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'

import schema from '../schema'
import { seedInterview } from '../lib/testSeed'
import { finalizeInterviewForProcessing } from './finalizeInterviewProcessing'
import type { InterviewSessionState } from '../../lib/interview/types'

const modules = import.meta.glob('../**/*.ts')

function harness() {
  return convexTest(schema, modules)
}

async function finalizeFromState(
  state: InterviewSessionState,
  roomName: string
) {
  const t = harness()
  const { sessionId } = await seedInterview(t, {
    roomName,
    sessionState: state,
    startedAt: new Date().toISOString(),
  })

  const result = await t.run(async (ctx) => {
    const session = await ctx.db.get(sessionId)
    if (!session) {
      throw new Error('missing session')
    }
    return await finalizeInterviewForProcessing(ctx, session, {
      detail: `test finalize from ${state}`,
      source: 'test',
      dedupeKey: `test-finalize:${sessionId}`,
    })
  })

  const session = await t.run((ctx) => ctx.db.get(sessionId))
  return { result, session }
}

describe('finalizeInterviewForProcessing', () => {
  test('transitions live → processing and queues', async () => {
    const { result, session } = await finalizeFromState('live', 'fin-live')
    expect(result).toEqual({ queued: true, transitioned: true })
    expect(session?.state).toBe('processing')
  })

  test('transitions interrupted → processing and queues', async () => {
    const { result, session } = await finalizeFromState(
      'interrupted',
      'fin-interrupted'
    )
    expect(result).toEqual({ queued: true, transitioned: true })
    expect(session?.state).toBe('processing')
  })

  test('normalizes connecting via interrupted then processing', async () => {
    const { result, session } = await finalizeFromState(
      'connecting',
      'fin-connecting'
    )
    expect(result).toEqual({ queued: true, transitioned: true })
    expect(session?.state).toBe('processing')
  })

  test('normalizes reconnecting via interrupted then processing', async () => {
    const { result, session } = await finalizeFromState(
      'reconnecting',
      'fin-reconnecting'
    )
    expect(result).toEqual({ queued: true, transitioned: true })
    expect(session?.state).toBe('processing')
  })

  test('idempotent when already processing: queued without transition', async () => {
    const t = harness()
    const { sessionId } = await seedInterview(t, {
      roomName: 'fin-already-processing',
      sessionState: 'processing',
      endedAt: new Date().toISOString(),
    })

    const first = await t.run(async (ctx) => {
      const session = await ctx.db.get(sessionId)
      if (!session) throw new Error('missing session')
      return await finalizeInterviewForProcessing(ctx, session, {
        detail: 'first',
        source: 'test',
        dedupeKey: `already:${sessionId}`,
      })
    })
    expect(first).toEqual({ queued: true, transitioned: false })

    const second = await t.run(async (ctx) => {
      const session = await ctx.db.get(sessionId)
      if (!session) throw new Error('missing session')
      return await finalizeInterviewForProcessing(ctx, session, {
        detail: 'second',
        source: 'test',
        dedupeKey: `already:${sessionId}`,
      })
    })
    expect(second).toEqual({ queued: true, transitioned: false })

    const session = await t.run((ctx) => ctx.db.get(sessionId))
    expect(session?.state).toBe('processing')
  })

  test('does not claim transitioned for disallowed states', async () => {
    const { result, session } = await finalizeFromState('ready', 'fin-ready')
    expect(result).toEqual({ queued: false, transitioned: false })
    expect(session?.state).toBe('ready')
  })
})
