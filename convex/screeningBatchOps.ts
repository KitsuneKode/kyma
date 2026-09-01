import { v } from 'convex/values'

import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import {
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server'
import {
  MAX_CANDIDATES_PER_SCREENING_BATCH,
  MAX_SCREENING_BATCHES_PER_LIST,
  SCREENING_OPS_LOOKUP_CONCURRENCY,
  assertLegacyScreeningBatchWithinLimit,
} from './helpers/screeningLimits'
import {
  getSessionOpsWindows,
  isInviteExpiringSoon,
  isStaleSessionWithoutReport,
} from './helpers/sessionOps'

type OperationalStatsSnapshot = {
  orgId: string
  batchId: Id<'screeningBatches'>
  expiringInviteCount: number
  stuckCandidateCount: number
  computedAt: number
} | null

const operationalStatsValidator = v.object({
  orgId: v.string(),
  batchId: v.id('screeningBatches'),
  expiringInviteCount: v.number(),
  stuckCandidateCount: v.number(),
  computedAt: v.number(),
})

export const computeScreeningBatchOperationalStats = internalQuery({
  args: {
    batchId: v.id('screeningBatches'),
    nowMs: v.number(),
  },
  returns: v.union(operationalStatsValidator, v.null()),
  handler: async (ctx, { batchId, nowMs }) => {
    const batch = await ctx.db.get(batchId)
    if (!batch) return null

    const [eligibility, invites] = await Promise.all([
      ctx.db
        .query('candidateEligibility')
        .withIndex('by_batch', (q) => q.eq('batchId', batchId))
        .take(MAX_CANDIDATES_PER_SCREENING_BATCH + 1),
      ctx.db
        .query('candidateInvites')
        .withIndex('by_batch', (q) => q.eq('batchId', batchId))
        .take(MAX_CANDIDATES_PER_SCREENING_BATCH + 1),
    ])
    assertLegacyScreeningBatchWithinLimit(eligibility.length)
    assertLegacyScreeningBatchWithinLimit(invites.length)

    const { expiringUntilMs, staleBeforeMs } = getSessionOpsWindows(nowMs)
    const expiringInviteCount = invites.filter((invite) =>
      isInviteExpiringSoon(invite.expiresAt, nowMs, expiringUntilMs)
    ).length

    let stuckCandidateCount = 0
    for (
      let offset = 0;
      offset < eligibility.length;
      offset += SCREENING_OPS_LOOKUP_CONCURRENCY
    ) {
      const chunk = eligibility.slice(
        offset,
        offset + SCREENING_OPS_LOOKUP_CONCURRENCY
      )
      const sessions = await Promise.all(
        chunk.map((candidate) =>
          ctx.db
            .query('interviewSessions')
            .withIndex('by_invite', (q) => q.eq('inviteId', candidate.inviteId))
            .order('desc')
            .first()
        )
      )
      const reports = await Promise.all(
        sessions.map((session) =>
          session
            ? ctx.db
                .query('assessmentReports')
                .withIndex('by_session', (q) => q.eq('sessionId', session._id))
                .first()
            : Promise.resolve(null)
        )
      )

      for (let index = 0; index < sessions.length; index += 1) {
        if (
          isStaleSessionWithoutReport(
            sessions[index]?.startedAt,
            staleBeforeMs,
            Boolean(reports[index])
          )
        ) {
          stuckCandidateCount += 1
        }
      }
    }

    return {
      orgId: batch.orgId,
      batchId,
      expiringInviteCount,
      stuckCandidateCount,
      computedAt: nowMs,
    }
  },
})

export const upsertScreeningBatchOperationalStats = internalMutation({
  args: operationalStatsValidator.fields,
  returns: v.null(),
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId)
    if (!batch || batch.orgId !== args.orgId) return null

    const existing = await ctx.db
      .query('screeningBatchOperationalStats')
      .withIndex('by_batch_id', (q) => q.eq('batchId', args.batchId))
      .unique()
    const values = {
      orgId: args.orgId,
      batchId: args.batchId,
      expiringInviteCount: args.expiringInviteCount,
      stuckCandidateCount: args.stuckCandidateCount,
      computedAt: args.computedAt,
    }
    if (existing) await ctx.db.patch(existing._id, values)
    else await ctx.db.insert('screeningBatchOperationalStats', values)
    return null
  },
})

export const refreshScreeningBatchOperationalStats = internalAction({
  args: {
    batchId: v.id('screeningBatches'),
    nowMs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { batchId, nowMs }) => {
    const computedAt = nowMs ?? Date.now()
    const stats: OperationalStatsSnapshot = await ctx.runQuery(
      internal.screeningBatchOps.computeScreeningBatchOperationalStats,
      { batchId, nowMs: computedAt }
    )
    if (stats) {
      await ctx.runMutation(
        internal.screeningBatchOps.upsertScreeningBatchOperationalStats,
        stats
      )
    }
    return null
  },
})

export const recomputeScreeningBatchCounters = internalMutation({
  args: { batchId: v.id('screeningBatches') },
  returns: v.null(),
  handler: async (ctx, { batchId }) => {
    const batch = await ctx.db.get(batchId)
    if (!batch) return null
    const eligibility = await ctx.db
      .query('candidateEligibility')
      .withIndex('by_batch', (q) => q.eq('batchId', batchId))
      .take(MAX_CANDIDATES_PER_SCREENING_BATCH + 1)
    assertLegacyScreeningBatchWithinLimit(eligibility.length)
    await ctx.db.patch(batchId, {
      candidateCount: eligibility.length,
      completedCount: eligibility.filter((row) => row.status === 'submitted')
        .length,
    })
    return null
  },
})

export const dispatchScreeningBatchOperationalStatsRefresh = internalMutation({
  args: {},
  returns: v.object({ scheduled: v.number() }),
  handler: async (ctx) => {
    const batches = await ctx.db
      .query('screeningBatches')
      .order('desc')
      .take(MAX_SCREENING_BATCHES_PER_LIST)
    const nowMs = Date.now()
    const activeBatches = batches.filter((batch) => batch.status === 'active')
    for (const batch of activeBatches) {
      await ctx.scheduler.runAfter(
        0,
        internal.screeningBatchOps.refreshScreeningBatchOperationalStats,
        { batchId: batch._id, nowMs }
      )
    }
    return { scheduled: activeBatches.length }
  },
})
