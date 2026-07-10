import type { InterviewSessionState } from './types'

const TRANSITIONS: Record<InterviewSessionState, InterviewSessionState[]> = {
  created: ['ready', 'failed'],
  ready: ['connecting', 'failed'],
  connecting: ['live', 'failed', 'reconnecting', 'interrupted'],
  live: ['reconnecting', 'interrupted', 'processing', 'failed'],
  reconnecting: ['live', 'interrupted', 'failed'],
  interrupted: ['connecting', 'live', 'processing', 'failed'],
  processing: ['completed', 'failed'],
  completed: [],
  failed: [],
}

/**
 * States that may enter post-call processing. `connecting` / `reconnecting`
 * are not direct edges to `processing`; callers must normalize through
 * {@link resolveProcessingTransitionPath} first.
 */
export const PROCESSING_ENTRY_STATES = [
  'live',
  'reconnecting',
  'interrupted',
  'connecting',
] as const satisfies readonly InterviewSessionState[]

export function canTransitionSession(
  current: InterviewSessionState,
  next: InterviewSessionState
) {
  return TRANSITIONS[current].includes(next)
}

export function transitionSession(
  current: InterviewSessionState,
  next: InterviewSessionState
) {
  if (!canTransitionSession(current, next)) {
    throw new Error(`Invalid session transition: ${current} -> ${next}`)
  }

  return next
}

export function transitionSessionSafely(
  current: InterviewSessionState,
  next: InterviewSessionState
) {
  return canTransitionSession(current, next) ? next : current
}

/**
 * Legal hop sequence from `from` into `processing`.
 * - Direct when the edge exists (`live` / `interrupted`).
 * - Via `interrupted` when the source is `connecting` or `reconnecting`
 *   (disconnect / abandon before a clean live→processing handoff).
 * - Empty when already `processing` or when no legal path exists.
 */
export function resolveProcessingTransitionPath(
  from: InterviewSessionState
): InterviewSessionState[] {
  if (from === 'processing') {
    return []
  }

  if (canTransitionSession(from, 'processing')) {
    return ['processing']
  }

  if (
    canTransitionSession(from, 'interrupted') &&
    canTransitionSession('interrupted', 'processing')
  ) {
    return ['interrupted', 'processing']
  }

  return []
}

export function getSessionStateLabel(state: InterviewSessionState) {
  switch (state) {
    case 'created':
      return 'Invite created'
    case 'ready':
      return 'Ready to join'
    case 'connecting':
      return 'Connecting'
    case 'live':
      return 'Interview live'
    case 'reconnecting':
      return 'Reconnecting'
    case 'interrupted':
      return 'Interrupted'
    case 'processing':
      return 'Processing'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
  }
}
