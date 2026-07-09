import { describe, expect, test } from 'vitest'

import { canAuthorizePublicSessionProcessing } from './interviewSession'
import type { Id } from '../_generated/dataModel'

const inviteId = 'jd7invite000000000000000' as Id<'candidateInvites'>
const otherInviteId = 'jd7invite111111111111111' as Id<'candidateInvites'>

describe('canAuthorizePublicSessionProcessing', () => {
  const futureExpiry = new Date(Date.now() + 60_000).toISOString()
  const pastExpiry = new Date(Date.now() - 60_000).toISOString()

  test('allows live session with active invite', () => {
    expect(
      canAuthorizePublicSessionProcessing({
        invite: {
          _id: inviteId,
          status: 'in_progress',
          expiresAt: futureExpiry,
        },
        session: { inviteId, state: 'live' },
      })
    ).toBe(true)
  })

  test('allows processing session even when invite is completed', () => {
    expect(
      canAuthorizePublicSessionProcessing({
        invite: {
          _id: inviteId,
          status: 'completed',
          expiresAt: futureExpiry,
        },
        session: { inviteId, state: 'processing' },
      })
    ).toBe(true)
  })

  test('denies expired invite status', () => {
    expect(
      canAuthorizePublicSessionProcessing({
        invite: {
          _id: inviteId,
          status: 'expired',
          expiresAt: futureExpiry,
        },
        session: { inviteId, state: 'live' },
      })
    ).toBe(false)
  })

  test('denies past expiresAt', () => {
    expect(
      canAuthorizePublicSessionProcessing({
        invite: {
          _id: inviteId,
          status: 'in_progress',
          expiresAt: pastExpiry,
        },
        session: { inviteId, state: 'live' },
      })
    ).toBe(false)
  })

  test('denies invite/session mismatch', () => {
    expect(
      canAuthorizePublicSessionProcessing({
        invite: {
          _id: inviteId,
          status: 'in_progress',
          expiresAt: futureExpiry,
        },
        session: { inviteId: otherInviteId, state: 'live' },
      })
    ).toBe(false)
  })

  test('denies completed session state', () => {
    expect(
      canAuthorizePublicSessionProcessing({
        invite: {
          _id: inviteId,
          status: 'completed',
          expiresAt: futureExpiry,
        },
        session: { inviteId, state: 'completed' },
      })
    ).toBe(false)
  })
})
