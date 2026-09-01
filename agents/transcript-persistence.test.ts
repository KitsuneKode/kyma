import { describe, expect, test } from 'vitest'

import type { AgentTranscriptSegment } from '../lib/agent/session-port'
import {
  createTranscriptPersistenceController,
  resolveConversationItemSpeaker,
} from './transcript-persistence'

describe('transcript persistence controller', () => {
  test('partial, partial, final produces one finalized candidate utterance', async () => {
    const rows = new Map<string, AgentTranscriptSegment>()
    let candidateFinals = 0
    const controller = createTranscriptPersistenceController({
      persist: async (segment) => {
        rows.set(segment.segmentId, segment)
      },
      onCandidateFinal: () => {
        candidateFinals += 1
      },
      onAgentFinal: () => undefined,
      onError: (error) => {
        throw error
      },
    })

    controller.onCandidateTranscript({
      transcript: 'I would',
      isFinal: false,
      createdAt: 1_000,
    })
    controller.onCandidateTranscript({
      transcript: 'I would begin',
      isFinal: false,
      createdAt: 1_100,
    })
    controller.onCandidateTranscript({
      transcript: 'I would begin with an example',
      isFinal: true,
      createdAt: 1_200,
    })
    await controller.flush()

    expect([...rows.values()]).toEqual([
      expect.objectContaining({
        segmentId: 'candidate:1000',
        speaker: 'candidate',
        status: 'final',
        text: 'I would begin with an example',
        startedAt: '1970-01-01T00:00:01.000Z',
      }),
    ])
    expect(candidateFinals).toBe(1)
  })

  test('separate finalized utterances use separate segment ids', async () => {
    const writes: AgentTranscriptSegment[] = []
    const controller = createTranscriptPersistenceController({
      persist: async (segment) => {
        writes.push(segment)
      },
      onCandidateFinal: () => undefined,
      onAgentFinal: () => undefined,
      onError: (error) => {
        throw error
      },
    })

    controller.onCandidateTranscript({
      transcript: 'First answer',
      isFinal: true,
      createdAt: 1_000,
    })
    controller.onCandidateTranscript({
      transcript: 'Second answer',
      isFinal: true,
      createdAt: 2_000,
    })
    await controller.flush()

    expect(writes.map((segment) => segment.segmentId)).toEqual([
      'candidate:1000',
      'candidate:2000',
    ])
  })

  test('persists assistant messages and ignores other conversation roles', () => {
    expect(resolveConversationItemSpeaker('assistant')).toBe('agent')
    expect(resolveConversationItemSpeaker('user')).toBeNull()
    expect(resolveConversationItemSpeaker('system')).toBeNull()
    expect(resolveConversationItemSpeaker('tool')).toBeNull()
  })
})
