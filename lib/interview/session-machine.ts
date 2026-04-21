import { type InterviewSessionState } from "@/lib/interview/types"

const TRANSITIONS: Record<InterviewSessionState, InterviewSessionState[]> = {
  created: ["ready", "failed"],
  ready: ["connecting", "failed"],
  connecting: ["live", "failed", "reconnecting"],
  live: ["reconnecting", "interrupted", "processing", "failed"],
  reconnecting: ["live", "interrupted", "failed"],
  interrupted: ["connecting", "processing", "failed"],
  processing: ["completed", "failed"],
  completed: [],
  failed: [],
}

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

export function getSessionStateLabel(state: InterviewSessionState) {
  switch (state) {
    case "created":
      return "Invite created"
    case "ready":
      return "Ready to join"
    case "connecting":
      return "Connecting"
    case "live":
      return "Interview live"
    case "reconnecting":
      return "Reconnecting"
    case "interrupted":
      return "Interrupted"
    case "processing":
      return "Processing"
    case "completed":
      return "Completed"
    case "failed":
      return "Failed"
  }
}
