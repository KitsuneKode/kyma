import type { MutationCtx, QueryCtx } from '../_generated/server'

export type OrgUsage = {
  interviewCount: number
  interviewMinutes: number
}

const EMPTY_USAGE: OrgUsage = { interviewCount: 0, interviewMinutes: 0 }

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
  args: { orgId: string; durationMs: number; nowMs?: number }
): Promise<void> {
  const nowMs = args.nowMs ?? Date.now()
  const period = currentUsagePeriod(nowMs)
  const minutes = Math.max(0, Math.round(args.durationMs / 60_000))

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
