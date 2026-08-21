// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'

import schema from './schema'
import {
  currentUsagePeriod,
  getUsageForPeriod,
  recordInterviewUsage,
} from './helpers/usageRollup'

const modules = import.meta.glob('./**/*.ts')

function harness() {
  return convexTest(schema, modules)
}

const AUG_2026 = Date.UTC(2026, 7, 21)

describe('org usage rollup', () => {
  test('period key is the UTC calendar month', () => {
    expect(currentUsagePeriod(Date.UTC(2026, 7, 21, 23, 30))).toBe('2026-08')
    expect(currentUsagePeriod(Date.UTC(2026, 0, 1, 0, 0))).toBe('2026-01')
    expect(currentUsagePeriod(Date.UTC(2026, 11, 31, 23, 59))).toBe('2026-12')
  })

  test('accumulates minutes and counts across sessions', async () => {
    const t = harness()

    await t.run(async (ctx) => {
      await recordInterviewUsage(ctx, {
        orgId: 'org_a',
        durationMs: 10 * 60_000,
        nowMs: AUG_2026,
      })
      await recordInterviewUsage(ctx, {
        orgId: 'org_a',
        durationMs: 5 * 60_000,
        nowMs: AUG_2026,
      })
    })

    const usage = await t.run((ctx) =>
      getUsageForPeriod(ctx, { orgId: 'org_a', period: '2026-08' })
    )

    expect(usage.interviewCount).toBe(2)
    expect(usage.interviewMinutes).toBe(15)
  })

  test('orgs are isolated from each other', async () => {
    const t = harness()

    await t.run(async (ctx) => {
      await recordInterviewUsage(ctx, {
        orgId: 'org_a',
        durationMs: 60_000,
        nowMs: AUG_2026,
      })
      await recordInterviewUsage(ctx, {
        orgId: 'org_b',
        durationMs: 60_000,
        nowMs: AUG_2026,
      })
    })

    const usage = await t.run((ctx) =>
      getUsageForPeriod(ctx, { orgId: 'org_a', period: '2026-08' })
    )

    expect(usage.interviewCount).toBe(1)
  })

  test('periods are isolated so a new month resets the cap', async () => {
    const t = harness()

    await t.run(async (ctx) => {
      await recordInterviewUsage(ctx, {
        orgId: 'org_a',
        durationMs: 90 * 60_000,
        nowMs: AUG_2026,
      })
      await recordInterviewUsage(ctx, {
        orgId: 'org_a',
        durationMs: 10 * 60_000,
        nowMs: Date.UTC(2026, 8, 2),
      })
    })

    const august = await t.run((ctx) =>
      getUsageForPeriod(ctx, { orgId: 'org_a', period: '2026-08' })
    )
    const september = await t.run((ctx) =>
      getUsageForPeriod(ctx, { orgId: 'org_a', period: '2026-09' })
    )

    expect(august.interviewMinutes).toBe(90)
    expect(september.interviewMinutes).toBe(10)
  })

  test('an unseen period reads as zero, not undefined', async () => {
    const t = harness()

    const usage = await t.run((ctx) =>
      getUsageForPeriod(ctx, { orgId: 'org_new', period: '2026-08' })
    )

    expect(usage).toEqual({ interviewCount: 0, interviewMinutes: 0 })
  })

  test('a sub-minute interview still counts as an interview', async () => {
    const t = harness()

    await t.run((ctx) =>
      recordInterviewUsage(ctx, {
        orgId: 'org_short',
        durationMs: 5_000,
        nowMs: AUG_2026,
      })
    )

    const usage = await t.run((ctx) =>
      getUsageForPeriod(ctx, { orgId: 'org_short', period: '2026-08' })
    )

    expect(usage.interviewCount).toBe(1)
    expect(usage.interviewMinutes).toBe(0)
  })
})
