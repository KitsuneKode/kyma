import { describe, expect, it } from 'vitest'

import {
  EXPIRING_INVITE_WINDOW_MS,
  STALE_SESSION_MS,
  STUCK_PROCESSING_MS,
  getSessionOpsWindows,
  isInviteExpiringSoon,
  isStaleSessionWithoutReport,
  isStuckProcessing,
} from './sessionOps'

describe('getSessionOpsWindows', () => {
  it('derives the 24h expiring window and 1h stale cutoff from nowMs', () => {
    const nowMs = 1_700_000_000_000
    expect(getSessionOpsWindows(nowMs)).toStrictEqual({
      nowMs,
      expiringUntilMs: nowMs + EXPIRING_INVITE_WINDOW_MS,
      staleBeforeMs: nowMs - STALE_SESSION_MS,
    })
  })
})

describe('isInviteExpiringSoon', () => {
  const nowMs = Date.parse('2026-07-09T12:00:00.000Z')
  const { expiringUntilMs } = getSessionOpsWindows(nowMs)

  it('returns true for invites expiring within the next 24 hours', () => {
    expect(
      isInviteExpiringSoon('2026-07-10T11:59:59.000Z', nowMs, expiringUntilMs)
    ).toBe(true)
  })

  it('returns false for invites that already expired', () => {
    expect(
      isInviteExpiringSoon('2026-07-09T11:59:59.000Z', nowMs, expiringUntilMs)
    ).toBe(false)
  })

  it('returns false for invites expiring after the 24h window', () => {
    expect(
      isInviteExpiringSoon('2026-07-10T12:00:01.000Z', nowMs, expiringUntilMs)
    ).toBe(false)
  })

  it('returns false for missing or invalid expiry strings', () => {
    expect(isInviteExpiringSoon(undefined, nowMs, expiringUntilMs)).toBe(false)
    expect(isInviteExpiringSoon(null, nowMs, expiringUntilMs)).toBe(false)
    expect(isInviteExpiringSoon('not-a-date', nowMs, expiringUntilMs)).toBe(
      false
    )
  })

  it('defaults expiringUntilMs when omitted', () => {
    expect(isInviteExpiringSoon('2026-07-10T00:00:00.000Z', nowMs)).toBe(true)
  })
})

describe('isStaleSessionWithoutReport', () => {
  const nowMs = Date.parse('2026-07-09T12:00:00.000Z')
  const { staleBeforeMs } = getSessionOpsWindows(nowMs)

  it('returns true for old sessions without a report', () => {
    expect(
      isStaleSessionWithoutReport(
        '2026-07-09T10:59:59.000Z',
        staleBeforeMs,
        false
      )
    ).toBe(true)
  })

  it('returns false when a report already exists', () => {
    expect(
      isStaleSessionWithoutReport(
        '2026-07-09T10:00:00.000Z',
        staleBeforeMs,
        true
      )
    ).toBe(false)
  })

  it('returns false for recent sessions', () => {
    expect(
      isStaleSessionWithoutReport(
        '2026-07-09T11:00:01.000Z',
        staleBeforeMs,
        false
      )
    ).toBe(false)
  })

  it('returns false when startedAt is missing or invalid', () => {
    expect(isStaleSessionWithoutReport(undefined, staleBeforeMs, false)).toBe(
      false
    )
    expect(isStaleSessionWithoutReport(null, staleBeforeMs, false)).toBe(false)
    expect(
      isStaleSessionWithoutReport('not-a-date', staleBeforeMs, false)
    ).toBe(false)
  })
})

describe('isStuckProcessing', () => {
  const nowMs = Date.parse('2026-07-09T12:00:00.000Z')

  it('returns true for processing sessions past the stuck threshold', () => {
    const endedAt = new Date(nowMs - STUCK_PROCESSING_MS).toISOString()
    expect(isStuckProcessing('processing', endedAt, nowMs)).toBe(true)
  })

  it('returns false when still within the processing grace window', () => {
    const endedAt = new Date(nowMs - STUCK_PROCESSING_MS + 1).toISOString()
    expect(isStuckProcessing('processing', endedAt, nowMs)).toBe(false)
  })

  it('returns false for non-processing states or missing endedAt', () => {
    const endedAt = new Date(nowMs - STUCK_PROCESSING_MS * 2).toISOString()
    expect(isStuckProcessing('live', endedAt, nowMs)).toBe(false)
    expect(isStuckProcessing('processing', undefined, nowMs)).toBe(false)
    expect(isStuckProcessing('processing', 'not-a-date', nowMs)).toBe(false)
  })
})
