import type { Participant, Room, TrackPublication } from 'livekit-client'

import type { InterviewSessionSnapshot } from '@/lib/interview/types'

export function createLocalEvent(
  type: InterviewSessionSnapshot['events'][number]['type'],
  detail: string
) {
  return {
    type,
    detail,
    createdAt: new Date().toISOString(),
  }
}

export function toIsoTimestamp(timestamp: number) {
  return new Date(timestamp).toISOString()
}

export function getTranscriptSpeaker(
  room: Room,
  participant?: Participant,
  publication?: TrackPublication
) {
  if (!participant) {
    return publication ? 'agent' : 'system'
  }

  if (
    participant.isLocal ||
    participant.identity === room.localParticipant.identity
  ) {
    return 'candidate'
  }

  return 'agent'
}

export function upsertLocalTranscriptSegment(
  transcript: InterviewSessionSnapshot['transcript'],
  segment: {
    id: string
    speaker: InterviewSessionSnapshot['transcript'][number]['speaker']
    text: string
    status: InterviewSessionSnapshot['transcript'][number]['status']
    startedAt: string
    endedAt?: string
  }
) {
  const index = transcript.findIndex((item) => item.id === segment.id)

  if (index === -1) {
    return [...transcript, segment]
  }

  const next = [...transcript]
  next[index] = {
    ...next[index],
    ...segment,
  }
  return next
}

export function summarizeTranscriptEvent(
  speaker: InterviewSessionSnapshot['transcript'][number]['speaker'],
  text: string
) {
  const speakerLabel =
    speaker === 'candidate'
      ? 'Candidate'
      : speaker === 'agent'
        ? 'Interviewer'
        : 'System'
  const normalized = text.trim().replace(/\s+/g, ' ')
  const excerpt =
    normalized.length > 120
      ? `${normalized.slice(0, 117).trimEnd()}...`
      : normalized

  return `${speakerLabel}: ${excerpt}`
}
