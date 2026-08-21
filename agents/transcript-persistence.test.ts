import { describe, expect, test } from 'vitest'

import { resolveConversationItemSpeaker } from './interviewer'

describe('conversation item speaker ownership', () => {
  test('assistant messages are persisted by the conversation-item handler', () => {
    expect(resolveConversationItemSpeaker('assistant')).toBe('agent')
  })

  test('user messages are ignored - UserInputTranscribed owns candidate speech', () => {
    expect(resolveConversationItemSpeaker('user')).toBeNull()
  })

  test('system and tool roles are ignored', () => {
    expect(resolveConversationItemSpeaker('system')).toBeNull()
    expect(resolveConversationItemSpeaker('tool')).toBeNull()
  })
})
