import { describe, expect, it } from 'vitest'

import { computeLivekitTokenTtlMinutes } from '@/lib/livekit/token'
import { resolveLivekitAgentName } from '@/lib/livekit/agent-name'

describe('resolveLivekitAgentName', () => {
  it('falls back to tutor-screener when unset', () => {
    expect(resolveLivekitAgentName(undefined)).toBe('tutor-screener')
    expect(resolveLivekitAgentName('')).toBe('tutor-screener')
  })

  it('uses configured agent name when provided', () => {
    expect(resolveLivekitAgentName('custom-agent')).toBe('custom-agent')
  })
})

describe('computeLivekitTokenTtlMinutes', () => {
  it('adds reconnect buffer to interview duration', () => {
    expect(computeLivekitTokenTtlMinutes(18)).toBe(33)
  })
})
