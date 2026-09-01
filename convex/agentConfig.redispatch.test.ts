// @vitest-environment edge-runtime
/// <reference types="vite/client" />

// Pipeline auth reads this while Convex modules are initialized.
process.env.KYMA_PROCESSING_WRITE_KEY = 'test-processing-key'

import { convexTest } from 'convex-test'
import { beforeEach, describe, expect, test } from 'vitest'

import { api } from './_generated/api'
import { seedInterview } from './lib/testSeed'
import schema from './schema'

const PROCESSING_KEY = 'test-processing-key'
const modules = import.meta.glob('./**/*.ts')

function harness() {
  return convexTest(schema, modules)
}

describe('agent config after worker redispatch', () => {
  beforeEach(() => {
    process.env.KYMA_PROCESSING_WRITE_KEY = PROCESSING_KEY
  })

  test('restores final candidate and agent turn counts from the transcript', async () => {
    const t = harness()
    const { sessionId } = await seedInterview(t, {
      roomName: 'room-redispatch-counters',
    })

    await t.run(async (ctx) => {
      for (const [speaker, status, suffix] of [
        ['candidate', 'final', 'candidate-1'],
        ['candidate', 'partial', 'candidate-partial'],
        ['candidate', 'final', 'candidate-2'],
        ['agent', 'final', 'agent-1'],
        ['system', 'final', 'system-1'],
      ] as const) {
        await ctx.db.insert('transcriptSegments', {
          sessionId,
          sourceSegmentId: suffix,
          speaker,
          status,
          text: suffix,
          startedAt: `2026-09-01T10:00:0${suffix.length}.000Z`,
        })
      }
    })

    const config = await t.query(api.agentConfig.getInterviewAgentConfig, {
      processingKey: PROCESSING_KEY,
      sessionId,
    })

    expect(config).toEqual(
      expect.objectContaining({
        candidateTurnCount: 2,
        agentTurnCount: 1,
      })
    )
  })
})
