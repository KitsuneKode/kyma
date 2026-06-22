import type { InterviewSessionState } from './types'

/**
 * Session states that only LiveKit webhooks and trusted server workers may write.
 * Candidate clients may mirror these locally for UI, but must not persist them.
 */
export const WEBHOOK_OWNED_SESSION_STATES = [
  'live',
  'reconnecting',
  'interrupted',
] as const satisfies readonly InterviewSessionState[]

/**
 * Processing is entered only through finalizeInterviewForProcessing so enqueue
 * and invite completion stay on one path.
 */
export const FINALIZE_OWNED_SESSION_STATES = [
  'processing',
] as const satisfies readonly InterviewSessionState[]

const TRUSTED_SESSION_STATE_SOURCES = new Set([
  'livekit-webhook',
  'livekit-agent',
  'assessment-pipeline',
])

export function isSessionStateWriteAllowed(
  source: string,
  nextState: InterviewSessionState
): boolean {
  if (TRUSTED_SESSION_STATE_SOURCES.has(source)) {
    return true
  }

  if (
    WEBHOOK_OWNED_SESSION_STATES.includes(
      nextState as (typeof WEBHOOK_OWNED_SESSION_STATES)[number]
    )
  ) {
    return false
  }

  if (
    FINALIZE_OWNED_SESSION_STATES.includes(
      nextState as (typeof FINALIZE_OWNED_SESSION_STATES)[number]
    )
  ) {
    return false
  }

  return true
}
