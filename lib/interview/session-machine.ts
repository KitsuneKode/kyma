import type { InterviewSessionState } from "./types";

const TRANSITIONS: Record<InterviewSessionState, InterviewSessionState[]> = {
  created: ["ready", "failed"],
  ready: ["connecting", "failed"],
  connecting: ["live", "failed", "reconnecting", "interrupted"],
  live: ["reconnecting", "interrupted", "processing", "failed"],
  reconnecting: ["live", "interrupted", "failed"],
  interrupted: ["connecting", "live", "processing", "failed"],
  processing: ["completed", "failed"],
  completed: [],
  failed: [],
};

export function canTransitionSession(
  current: InterviewSessionState,
  next: InterviewSessionState,
) {
  return TRANSITIONS[current].includes(next);
}

export function transitionSession(
  current: InterviewSessionState,
  next: InterviewSessionState,
) {
  if (!canTransitionSession(current, next)) {
    throw new Error(`Invalid session transition: ${current} -> ${next}`);
  }

  return next;
}

export function transitionSessionSafely(
  current: InterviewSessionState,
  next: InterviewSessionState,
) {
  return canTransitionSession(current, next) ? next : current;
}

export function getSessionStateLabel(state: InterviewSessionState) {
  switch (state) {
    case "created":
      return "Invite created";
    case "ready":
      return "Ready to join";
    case "connecting":
      return "Connecting";
    case "live":
      return "Interview live";
    case "reconnecting":
      return "Reconnecting";
    case "interrupted":
      return "Interrupted";
    case "processing":
      return "Processing";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
  }
}
