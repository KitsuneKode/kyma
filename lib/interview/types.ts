export const SESSION_STATES = [
  'created',
  'ready',
  'connecting',
  'live',
  'reconnecting',
  'interrupted',
  'processing',
  'completed',
  'failed',
] as const

export type InterviewSessionState = (typeof SESSION_STATES)[number]

export type InviteAccessState =
  | 'available'
  | 'expired'
  | 'consumed'
  | 'unavailable'

export type InterviewDurationMode = 'timed' | 'flexible'

export type InterviewPolicy = {
  durationMode: InterviewDurationMode
  targetDurationMinutes?: number
  allowsResume: boolean
  maxAttempts: number
  expiresAt?: string
}

export const PRE_FLIGHT_STEPS = [
  'browser-check',
  'microphone-check',
  'speaker-check',
  'network-check',
  'environment-check',
] as const

export type PreflightStepKey = (typeof PRE_FLIGHT_STEPS)[number]

export type PreflightStepStatus = 'pending' | 'running' | 'passed' | 'failed'

export type PreflightStep = {
  key: PreflightStepKey
  label: string
  description: string
  status: PreflightStepStatus
}

export type SessionEventType =
  | 'invite-opened'
  | 'preflight-started'
  | 'preflight-completed'
  | 'room-token-requested'
  | 'participant-connecting'
  | 'participant-joined'
  | 'participant-left'
  | 'agent-speaking'
  | 'candidate-speaking'
  | 'reconnect-started'
  | 'reconnect-succeeded'
  | 'reconnect-failed'
  | 'transcript-partial'
  | 'transcript-final'
  | 'candidate-screen-share-started'
  | 'candidate-screen-share-stopped'
  | 'teaching-simulation-started'
  | 'teaching-simulation-completed'
  | 'processing-started'
  | 'processing-completed'
  | 'session-failed'

export type SessionEvent = {
  type: SessionEventType
  createdAt: string
  detail: string
}

export type TranscriptSegmentStatus = 'partial' | 'final'

export type TranscriptSegmentSpeaker = 'agent' | 'candidate' | 'system'

export type TranscriptSegment = {
  id: string
  speaker: TranscriptSegmentSpeaker
  text: string
  status: TranscriptSegmentStatus
  startedAt: string
  endedAt?: string
}

export type RecordingArtifact = {
  id: string
  provider: 'livekit'
  egressId: string
  artifactKey: string
  roomName: string
  artifactType: 'audio' | 'video' | 'composite' | 'segments'
  status: 'starting' | 'active' | 'complete' | 'failed'
  filename?: string
  location?: string
  manifestLocation?: string
  startedAt?: string
  endedAt?: string
  durationMs?: number
  sizeBytes?: number
  error?: string
}

export type InterviewSessionSnapshot = {
  inviteId: string
  sessionId?: string
  candidateName?: string
  templateName: string
  state: InterviewSessionState
  accessState: InviteAccessState
  accessMessage?: string
  policy: InterviewPolicy
  roomName?: string
  events: SessionEvent[]
  preflight: PreflightStep[]
  transcript: TranscriptSegment[]
  recordings: RecordingArtifact[]
}
