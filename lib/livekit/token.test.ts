import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  computeLivekitTokenTtlMinutes,
  createParticipantToken,
} from '@/lib/livekit/token'
import { resolveLivekitAgentName } from '@/lib/livekit/agent-name'

vi.mock('@/lib/livekit/config', () => ({
  getLivekitServerEnv: () => ({
    NEXT_PUBLIC_LIVEKIT_URL: 'wss://test.livekit.cloud',
    LIVEKIT_API_KEY: 'API_TEST_KEY',
    LIVEKIT_API_SECRET: 'API_TEST_SECRET',
    LIVEKIT_AGENT_NAME: 'tutor-screener',
  }),
}))

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

function decodeJwtPayload(token: string) {
  const payload = token.split('.')[1]
  if (!payload) {
    throw new Error('Invalid JWT')
  }
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    sub?: string
    video?: { room?: string }
    name?: string
  }
}

describe('createParticipantToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('embeds candidate session identity and room grants', async () => {
    const sessionId = 'jh7abc123sessionid'
    const { token, roomName, participantName } = await createParticipantToken({
      roomName: 'interview-test-room',
      participantName: 'Alex',
      participantIdentity: `candidate-${sessionId}`,
      metadata: JSON.stringify({ sessionId, role: 'candidate' }),
      tokenTtlMinutes: 25,
    })

    expect(roomName).toBe('interview-test-room')
    expect(participantName).toBe('Alex')

    const payload = decodeJwtPayload(token)
    expect(payload.sub).toBe(`candidate-${sessionId}`)
    expect(payload.name).toBe('Alex')
    expect(payload.video?.room).toBe('interview-test-room')
  })
})
