import type { MutationCtx, QueryCtx } from '../_generated/server'

export type OrgUsage = {
  interviewCount: number
  interviewMinutes: number
}

const EMPTY_USAGE: OrgUsage = { interviewCount: 0, interviewMinutes: 0 }

/**
 * Hard ceiling on what a single session can contribute to an invoice. Well
 * above any legitimate interview, low enough that a corrupt duration cannot
 * bill a customer for days of usage.
 */
const MAX_BILLABLE_SESSION_MS = 4 * 60 * 60_000

/** Billing periods are calendar months in UTC so they do not drift by tenant. */
export function currentUsagePeriod(nowMs: number = Date.now()): string {
  const date = new Date(nowMs)
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0')
  return `${date.getUTCFullYear()}-${month}`
}

export async function getUsageForPeriod(
  ctx: QueryCtx | MutationCtx,
  args: { orgId: string; period: string }
): Promise<OrgUsage> {
  const row = await ctx.db
    .query('orgUsageRollups')
    .withIndex('by_org_and_period', (q) =>
      q.eq('orgId', args.orgId).eq('period', args.period)
    )
    .first()

  if (!row) {
    return EMPTY_USAGE
  }

  return {
    interviewCount: row.interviewCount,
    interviewMinutes: row.interviewMinutes,
  }
}

/**
 * Accumulates one completed interview into the org's current billing period.
 *
 * Called from finalize, which every interview passes through exactly once
 * whether it ended cleanly or was reaped. `activeDurationMs` is tracked per
 * session but was never aggregated, so there was no number to enforce a plan
 * cap against and nothing to invoice on.
 */
export async function recordInterviewUsage(
  ctx: MutationCtx,
  args: {
    orgId: string
    durationMs: number
    nowMs?: number
    maxDurationMs?: number
  }
): Promise<void> {
  const nowMs = args.nowMs ?? Date.now()
  const period = currentUsagePeriod(nowMs)
  // Defence in depth against a corrupt duration reaching the invoice.
  // `applySessionStateTransition` clamps the live segment at the source; this
  // bounds anything that arrives by another path.
  const boundedMs = Math.min(
    Math.max(0, args.durationMs),
    args.maxDurationMs ?? MAX_BILLABLE_SESSION_MS
  )
  const minutes = Math.round(boundedMs / 60_000)

  const existing = await ctx.db
    .query('orgUsageRollups')
    .withIndex('by_org_and_period', (q) =>
      q.eq('orgId', args.orgId).eq('period', period)
    )
    .first()

  if (existing) {
    await ctx.db.patch(existing._id, {
      interviewCount: existing.interviewCount + 1,
      interviewMinutes: existing.interviewMinutes + minutes,
      updatedAt: nowMs,
    })
    return
  }

  await ctx.db.insert('orgUsageRollups', {
    orgId: args.orgId,
    period,
    interviewCount: 1,
    interviewMinutes: minutes,
    updatedAt: nowMs,
  })
}
