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

export type SessionState = (typeof SESSION_STATES)[number]

/** Alias used across interview session code. */
export type InterviewSessionState = SessionState
