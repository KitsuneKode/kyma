import { describe, expect, it } from 'vitest'

import { isSessionStateWriteAllowed } from '@/lib/interview/session-state-ownership'

describe('isSessionStateWriteAllowed', () => {
  it('blocks candidate clients from webhook-owned states', () => {
    expect(isSessionStateWriteAllowed('candidate-client', 'live')).toBe(false)
    expect(isSessionStateWriteAllowed('candidate-client', 'interrupted')).toBe(
      false
    )
    expect(isSessionStateWriteAllowed('candidate-client', 'reconnecting')).toBe(
      false
    )
  })

  it('blocks candidate clients from processing transitions', () => {
    expect(isSessionStateWriteAllowed('candidate-client', 'processing')).toBe(
      false
    )
  })

  it('allows trusted server sources to write lifecycle states', () => {
    expect(isSessionStateWriteAllowed('livekit-webhook', 'live')).toBe(true)
    expect(isSessionStateWriteAllowed('livekit-agent', 'processing')).toBe(true)
  })
})
