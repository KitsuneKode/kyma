import type { AgentTranscriptSegment } from '../lib/agent/session-port'

type Timestamp = string | number

export type CandidateTranscriptEvent = {
  transcript: string
  isFinal: boolean
  createdAt: Timestamp
}

export type ConversationMessageEvent = {
  id: string
  role: string
  textContent?: string | null
  createdAt: Timestamp
}

type TranscriptPersistenceOptions = {
  persist: (segment: AgentTranscriptSegment) => Promise<void>
  onCandidateFinal: (event: CandidateTranscriptEvent) => void
  onAgentFinal: (event: ConversationMessageEvent) => void
  onError: (error: unknown) => void
}

/**
 * Candidate speech is owned by LiveKit's transcript event, while conversation
 * items own assistant speech. Accepting user conversation items here would
 * persist every candidate turn a second time under a different segment id.
 */
export function resolveConversationItemSpeaker(role: string): 'agent' | null {
  return role === 'assistant' ? 'agent' : null
}

export function createTranscriptPersistenceController(
  options: TranscriptPersistenceOptions
) {
  let activeCandidate: { segmentId: string; startedAt: string } | undefined
  let pendingWrites: Promise<void> = Promise.resolve()

  const enqueue = (segment: AgentTranscriptSegment) => {
    // LiveKit event handlers cannot await writes. Serializing the chain keeps a
    // late partial from overtaking the final update for the same utterance.
    pendingWrites = pendingWrites
      .catch(() => undefined)
      .then(() => options.persist(segment))
      .catch((error) => options.onError(error))
  }

  const onCandidateTranscript = (event: CandidateTranscriptEvent) => {
    activeCandidate ??= {
      segmentId: `candidate:${event.createdAt}`,
      startedAt: new Date(event.createdAt).toISOString(),
    }

    enqueue({
      segmentId: activeCandidate.segmentId,
      speaker: 'candidate',
      text: event.transcript,
      status: event.isFinal ? 'final' : 'partial',
      startedAt: activeCandidate.startedAt,
    })

    if (event.isFinal) {
      activeCandidate = undefined
      options.onCandidateFinal(event)
    }
  }

  const onConversationItem = (event: ConversationMessageEvent) => {
    const text = event.textContent?.trim()
    const speaker = resolveConversationItemSpeaker(event.role)

    if (!text || !speaker) {
      return
    }

    enqueue({
      segmentId: event.id,
      speaker,
      text,
      status: 'final',
      startedAt: new Date(event.createdAt).toISOString(),
    })
    options.onAgentFinal(event)
  }

  return {
    onCandidateTranscript,
    onConversationItem,
    flush: async () => {
      await pendingWrites
    },
  }
}
