// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { internal } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

const ORG_ID = 'org_erasure'
const SUBJECT_EMAIL = 'subject@example.com'

function harness() {
  return convexTest(schema, modules)
}

/**
 * Seeds `sessionCount` sessions for one subject, each carrying
 * `segmentsPerSession` transcript rows. Both numbers deliberately exceed
 * DELETE_BATCH (40) so the batching and draining paths are exercised.
 */
async function seedSubject(
  t: ReturnType<typeof harness>,
  {
    sessionCount,
    segmentsPerSession,
  }: {
    sessionCount: number
    segmentsPerSession: number
  }
) {
  await t.run(async (ctx) => {
    const templateId = await ctx.db.insert('assessmentTemplates', {
      orgId: ORG_ID,
      name: 'Erasure template',
      role: 'engineer',
      status: 'active',
      createdBy: 'seed',
      rubricVersion: 'v1',
    })

    for (let index = 0; index < sessionCount; index += 1) {
      const inviteId = await ctx.db.insert('candidateInvites', {
        orgId: ORG_ID,
        inviteToken: `erasure-token-${index}`,
        candidateEmail: SUBJECT_EMAIL,
        candidateName: 'Subject Person',
        templateId,
        status: 'completed',
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })

      const sessionId = await ctx.db.insert('interviewSessions', {
        orgId: ORG_ID,
        inviteId,
        state: 'completed',
        provider: 'livekit',
        roomName: `erasure-room-${index}`,
        startedAt: new Date().toISOString(),
      })

      for (let segment = 0; segment < segmentsPerSession; segment += 1) {
        await ctx.db.insert('transcriptSegments', {
          sessionId,
          sourceSegmentId: `seg-${index}-${segment}`,
          speaker: 'candidate',
          text: `sensitive utterance ${segment}`,
          status: 'final',
          startedAt: new Date().toISOString(),
        })
      }
    }
  })
}

async function runErasureToCompletion(t: ReturnType<typeof harness>) {
  // The mutation self-reschedules until the subject has no sessions left, so
  // the whole chain must be drained - not just the first scheduled pass.
  await t.mutation(internal.compliance.deleteSubjectData, {
    orgId: ORG_ID,
    subjectEmail: SUBJECT_EMAIL,
    requestId: 'dsr-test',
  })
  await t.finishAllScheduledFunctions(vi.runAllTimers)
}

describe('subject data erasure', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('removes every session, not just the first batch', async () => {
    const t = harness()
    await seedSubject(t, { sessionCount: 60, segmentsPerSession: 2 })

    await runErasureToCompletion(t)

    const remaining = await t.run((ctx) =>
      ctx.db
        .query('interviewSessions')
        .withIndex('by_org_id', (q) => q.eq('orgId', ORG_ID))
        .collect()
    )

    expect(remaining).toHaveLength(0)
  })

  test('leaves no orphaned transcript rows for long interviews', async () => {
    const t = harness()
    // 100 segments per session is well past DELETE_BATCH, which is exactly the
    // case that previously left candidate speech in the database.
    await seedSubject(t, { sessionCount: 3, segmentsPerSession: 100 })

    await runErasureToCompletion(t)

    const orphans = await t.run((ctx) =>
      ctx.db.query('transcriptSegments').collect()
    )

    expect(orphans).toHaveLength(0)
  })

  test('a single small subject is erased in one pass', async () => {
    const t = harness()
    await seedSubject(t, { sessionCount: 1, segmentsPerSession: 3 })

    await runErasureToCompletion(t)

    const sessions = await t.run((ctx) =>
      ctx.db.query('interviewSessions').collect()
    )
    const segments = await t.run((ctx) =>
      ctx.db.query('transcriptSegments').collect()
    )

    expect(sessions).toHaveLength(0)
    expect(segments).toHaveLength(0)
  })
})
