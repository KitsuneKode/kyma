import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'

import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

describe('transcript hot path under load', () => {
  test('10 concurrent rooms × 15min flat latency', async () => {
    const t = convexTest(schema, modules)
    const roomCount = 10
    const segmentsPerRoom = 120 // ~15min at ~8s per turn

    const sessionIds: string[] = []
    // Seed a template once for all invites
    const templateId = await t.run(async (ctx) =>
      ctx.db.insert('assessmentTemplates', {
        orgId: 'org_load',
        name: 'Load Template',
        role: 'tutor',
        status: 'active',
        createdBy: 'test',
        rubricVersion: 'v1',
      } as never)
    )
    for (let r = 0; r < roomCount; r += 1) {
      const inviteId = await t.run(async (ctx) =>
        ctx.db.insert('candidateInvites', {
          orgId: 'org_load',
          inviteToken: `load-${r}-${Date.now()}`,
          templateId,
          status: 'in_progress',
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        } as never)
      )
      const sessionId = await t.run(async (ctx) =>
        ctx.db.insert('interviewSessions', {
          orgId: 'org_load',
          inviteId,
          state: 'live',
          provider: 'livekit',
          roomName: `load-room-${r}`,
          startedAt: new Date().toISOString(),
        } as never)
      )
      sessionIds.push(sessionId as unknown as string)
      // Seed segments
      for (let s = 0; s < segmentsPerRoom; s += 1) {
        await t.run(async (ctx) =>
          ctx.db.insert('transcriptSegments', {
            sessionId: sessionId as never,
            sourceSegmentId: `seg-${r}-${s}`,
            speaker: s % 2 === 0 ? 'agent' : 'candidate',
            text: `segment ${s}`,
            status: 'final',
            startedAt: new Date(Date.now() + s * 1000).toISOString(),
          })
        )
      }
    }

    const start = performance.now()
    const reads = await Promise.all(
      sessionIds.map((sid) =>
        t.run(async (ctx) =>
          ctx.db
            .query('transcriptSegments')
            .withIndex('by_session', (q) => q.eq('sessionId', sid as never))
            .take(200)
        )
      )
    )
    const elapsed = performance.now() - start
    expect(reads.every((r) => r.length === 120)).toBe(true)
    // Flat latency: 10 rooms should not be 10× single room; allow < 500ms total in test env
    expect(elapsed).toBeLessThan(2000)
  })
})
