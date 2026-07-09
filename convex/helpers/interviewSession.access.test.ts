import { describe, expect, test } from 'vitest'

import { deriveAccessState, isInviteExpired } from './interviewSession'

describe('isInviteExpired', () => {
  test('rejects past expiresAt', () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    expect(isInviteExpired(past)).toBe(true)
  })

  test('allows future expiresAt', () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    expect(isInviteExpired(future)).toBe(false)
  })

  test('treats invalid expiresAt as expired', () => {
    expect(isInviteExpired('not-a-date')).toBe(true)
  })

  test('respects explicit nowMs for boundary checks', () => {
    const expiresAt = '2026-07-09T12:00:00.000Z'
    expect(isInviteExpired(expiresAt, Date.parse(expiresAt))).toBe(true)
    expect(isInviteExpired(expiresAt, Date.parse(expiresAt) - 1)).toBe(false)
  })
})

describe('deriveAccessState expiry rejection', () => {
  test('marks expired status as expired access', () => {
    const result = deriveAccessState(
      {
        status: 'expired',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
      { state: 'ready' }
    )
    expect(result.accessState).toBe('expired')
    expect(result.accessMessage).toMatch(/expired/i)
  })

  test('marks past expiresAt as expired even when status is open', () => {
    const result = deriveAccessState(
      {
        status: 'opened',
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      },
      { state: 'live' }
    )
    expect(result.accessState).toBe('expired')
  })

  test('keeps available access for active invite', () => {
    const result = deriveAccessState(
      {
        status: 'in_progress',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
      { state: 'live' }
    )
    expect(result.accessState).toBe('available')
    expect(result.accessMessage).toBeUndefined()
  })
})
