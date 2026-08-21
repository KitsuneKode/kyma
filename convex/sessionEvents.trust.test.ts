// @vitest-environment edge-runtime
/// <reference types="vite/client" />

// Trusted-write key must be set before any Convex module imports the env shim.
process.env.KYMA_PROCESSING_WRITE_KEY = 'test-processing-key'

import { convexTest } from 'convex-test'
import { beforeEach, describe, expect, test } from 'vitest'

import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'
import { seedInterview } from './lib/testSeed'

const PROCESSING_KEY = 'test-processing-key'
const modules = import.meta.glob('./**/*.ts')

function harness() {
  return convexTest(schema, modules)
}

async function sessionEventsFor(
  t: ReturnType<typeof harness>,
  sessionId: Id<'interviewSessions'>
) {
  return await t.run(async (ctx) =>
    ctx.db
      .query('sessionEvents')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
      .collect()
  )
}

describe('appendSessionEvent trust boundary', () => {
  beforeEach(() => {
    process.env.KYMA_PROCESSING_WRITE_KEY = PROCESSING_KEY
  })

  test('a candidate cannot claim a privileged source to force processing', async () => {
    const t = harness()
    const { sessionId, inviteToken } = await seedInterview(t, {
      roomName: 'room-trust-force',
      sessionState: 'live',
    })

    await t.mutation(api.interviews.sessionEvents.appendSessionEvent, {
      inviteToken,
      sessionId,
      type: 'candidate-submitted',
      detail: 'attempt to self-finalize',
      source: 'assessment-pipeline',
      state: 'processing',
    })

    const session = await t.run((ctx) => ctx.db.get(sessionId))
    expect(session?.state).not.toBe('processing')
  })

  test('a candidate cannot claim a webhook source to force live states', async () => {
    const t = harness()
    const { sessionId, inviteToken } = await seedInterview(t, {
      roomName: 'room-trust-live',
      sessionState: 'connecting',
    })

    await t.mutation(api.interviews.sessionEvents.appendSessionEvent, {
      inviteToken,
      sessionId,
      type: 'participant_joined',
      detail: 'attempt to self-promote to live',
      source: 'livekit-webhook',
      state: 'live',
    })

    const session = await t.run((ctx) => ctx.db.get(sessionId))
    expect(session?.state).toBe('connecting')
  })

  test('the event is still recorded, attributed to the candidate', async () => {
    const t = harness()
    const { sessionId, inviteToken } = await seedInterview(t, {
      roomName: 'room-trust-attrib',
      sessionState: 'live',
    })

    await t.mutation(api.interviews.sessionEvents.appendSessionEvent, {
      inviteToken,
      sessionId,
      type: 'candidate-submitted',
      detail: 'attempt to self-finalize',
      source: 'assessment-pipeline',
      state: 'processing',
    })

    const events = await sessionEventsFor(t, sessionId)
    expect(events.at(-1)?.source).toBe('candidate-client')
  })

  test('a trusted caller with the processing key keeps its declared source', async () => {
    const t = harness()
    const { sessionId } = await seedInterview(t, {
      roomName: 'room-trust-trusted',
      sessionState: 'live',
    })

    await t.mutation(api.interviews.sessionEvents.appendSessionEvent, {
      processingKey: PROCESSING_KEY,
      sessionId,
      type: 'processing-requested',
      detail: 'pipeline finalize',
      source: 'assessment-pipeline',
    })

    const events = await sessionEventsFor(t, sessionId)
    expect(events.at(-1)?.source).toBe('assessment-pipeline')
  })
})
