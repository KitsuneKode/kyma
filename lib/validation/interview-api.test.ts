import { describe, expect, it } from 'vitest'

import { bootstrapBodySchema, reportChatBodySchema } from './interview-api'

describe('bootstrapBodySchema', () => {
  it('accepts valid payload', () => {
    const parsed = bootstrapBodySchema.parse({
      inviteToken: 'demo-invite',
      participantName: 'Jo',
    })
    expect(parsed.inviteToken).toBe('demo-invite')
  })

  it('rejects short participant name', () => {
    expect(() =>
      bootstrapBodySchema.parse({ inviteToken: 'x', participantName: 'J' })
    ).toThrow()
  })
})

describe('reportChatBodySchema', () => {
  it('accepts minimal payload', () => {
    const parsed = reportChatBodySchema.parse({
      sessionId: 'abc123',
      question: 'What are the risks?',
    })
    expect(parsed.question).toBe('What are the risks?')
  })
})
