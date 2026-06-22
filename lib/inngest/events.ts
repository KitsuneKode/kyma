/**
 * Shared Inngest event identifiers for the interview processing pipeline.
 * Imported by the Convex enqueue action, the Next API fallback, and the
 * Inngest function trigger so the event name and dedupe id never drift.
 */

export const INTERVIEW_PROCESSING_REQUESTED_EVENT =
  'kyma/interview.processing.requested'

export function interviewProcessingEventId(sessionId: string) {
  return `interview-processing-${sessionId}`
}

export type InterviewProcessingRequestedPayload = {
  sessionId: string
}
