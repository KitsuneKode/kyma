// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { makeFunctionReference } from 'convex/server'
import { describe, expect, test } from 'vitest'

import type { Id } from './_generated/dataModel'
import { applySessionStateTransition } from './helpers/interviewSession'
import { getSessionOpsWindows } from './helpers/sessionOps'
import screeningsSource from './recruiter/screenings.ts?raw'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

function harness() {
  return convexTest(schema, modules)
}

async function seedBatch(t: ReturnType<typeof harness>) {
  return await t.run(async (ctx) => {
    const orgId = 'org_capacity'
    const templateId = await ctx.db.insert('assessmentTemplates', {
      orgId,
      name: 'Capacity template',
      role: 'engineer',
      status: 'active',
      createdBy: 'test',
      rubricVersion: 'v1',
    })
    const batchId = await ctx.db.insert('screeningBatches', {
      orgId,
      name: 'Capacity batch',
      templateId,
      createdBy: 'test',
      status: 'active',
      allowedAttempts: 1,
      createdAt: new Date().toISOString(),
    })
    return { orgId, templateId, batchId }
  })
}

describe('screening batch counters', () => {
  test('initializes legacy counters exactly and increments only once', async () => {
    const t = harness()
    const { orgId, templateId, batchId } = await seedBatch(t)
    const sessionId = await t.run(async (ctx) => {
      let transitionSessionId: Id<'interviewSessions'> | undefined
      for (const [index, status] of [
        'submitted',
        'invited',
        'invited',
      ].entries()) {
        const inviteId = await ctx.db.insert('candidateInvites', {
          orgId,
          inviteToken: `counter-${index}`,
          templateId,
          batchId,
          status: 'created',
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        })
        const eligibilityId = await ctx.db.insert('candidateEligibility', {
          orgId,
          batchId,
          inviteId,
          candidateName: `Candidate ${index}`,
          allowedAttempts: 1,
          attemptCount: 0,
          status: status as 'submitted' | 'invited',
          createdAt: new Date().toISOString(),
        })
        await ctx.db.patch(inviteId, { eligibilityId })

        if (index === 1) {
          transitionSessionId = await ctx.db.insert('interviewSessions', {
            orgId,
            inviteId,
            state: 'live',
            provider: 'livekit',
          })
        }
      }
      return transitionSessionId!
    })

    await t.run(async (ctx) => {
      const session = await ctx.db.get(sessionId)
      await applySessionStateTransition(ctx, session!, sessionId, 'processing')
      const transitioned = await ctx.db.get(sessionId)
      await applySessionStateTransition(
        ctx,
        transitioned!,
        sessionId,
        'completed'
      )
    })

    const batch = await t.run((ctx) => ctx.db.get(batchId))
    expect(batch).toEqual(
      expect.objectContaining({ candidateCount: 3, completedCount: 2 })
    )
  })
})

describe('screening batch operational stats', () => {
  test('refreshes exact expiring and stale counts for one bounded batch', async () => {
    const t = harness()
    const { orgId, templateId, batchId } = await seedBatch(t)
    const nowMs = Date.now()
    const { staleBeforeMs } = getSessionOpsWindows(nowMs)

    await t.run(async (ctx) => {
      const expiringInviteId = await ctx.db.insert('candidateInvites', {
        orgId,
        inviteToken: 'expiring',
        templateId,
        batchId,
        status: 'created',
        expiresAt: new Date(nowMs + 60_000).toISOString(),
      })
      const staleInviteId = await ctx.db.insert('candidateInvites', {
        orgId,
        inviteToken: 'stale',
        templateId,
        batchId,
        status: 'in_progress',
        expiresAt: new Date(nowMs + 7 * 86_400_000).toISOString(),
      })
      for (const [index, inviteId] of [
        expiringInviteId,
        staleInviteId,
      ].entries()) {
        await ctx.db.insert('candidateEligibility', {
          orgId,
          batchId,
          inviteId,
          candidateName: `Ops ${index}`,
          allowedAttempts: 1,
          attemptCount: 0,
          status: 'invited',
          createdAt: new Date(nowMs).toISOString(),
        })
      }
      await ctx.db.insert('interviewSessions', {
        orgId,
        inviteId: staleInviteId,
        state: 'completed',
        provider: 'livekit',
        startedAt: new Date(staleBeforeMs - 1_000).toISOString(),
      })
    })

    const refresh = makeFunctionReference<
      'action',
      { batchId: Id<'screeningBatches'>; nowMs?: number },
      null
    >('screeningBatchOps:refreshScreeningBatchOperationalStats')
    await t.action(refresh, { batchId, nowMs })

    const stats = await t.run((ctx) =>
      ctx.db
        .query('screeningBatchOperationalStats')
        .withIndex('by_batch_id', (q) => q.eq('batchId', batchId))
        .unique()
    )
    expect(stats).toEqual(
      expect.objectContaining({
        expiringInviteCount: 1,
        stuckCandidateCount: 1,
        computedAt: nowMs,
      })
    )
  })

  test('the reactive list does not read per-candidate production tables', () => {
    const listSource = screeningsSource
      .split('export const listScreeningBatches =')[1]
      ?.split('export const getScreeningBatchDetail =')[0]

    expect(listSource).toBeTruthy()
    for (const table of [
      'candidateEligibility',
      'candidateInvites',
      'interviewSessions',
      'assessmentReports',
    ]) {
      expect(listSource).not.toContain(`query('${table}')`)
    }
  })
})
