import type { FunctionReturnType } from 'convex/server'

import { api } from '@/convex/_generated/api'
import {
  PRE_FLIGHT_STEPS,
  type InviteAccessState,
  type InterviewPolicy,
  type InterviewSessionSnapshot,
  type PreflightStep,
  type SessionEvent,
} from '@/lib/interview/types'
import { DEFAULT_INTERVIEW_POLICY } from '@/lib/interview/policy'
import { createDefaultPreflightSteps } from '@/lib/interview/preflight'
import { mapDbEventTypeToUi } from '@/lib/interview/session-events'

/**
 * The single canonical public candidate read model is the source of this shape.
 * Trusting its inferred type (state, transcript, and policy are all
 * validated unions at the Convex boundary) lets the snapshot layer drop the
 * defensive runtime normalization it used to carry. Only `sessionEvents.type`
 * is a free string in the DB, so it is the one field still mapped — in exactly
 * one place, `mapDbEventTypeToUi`. Both the SSR initial paint and the reactive
 * client subscription consume this same shape.
 */
type PublicSessionDetail = NonNullable<
  FunctionReturnType<typeof api.interviews.public.getPublicSessionDetail>
>

function mapEvents(events: PublicSessionDetail['events']): SessionEvent[] {
  return events.flatMap((event) => {
    const type = mapDbEventTypeToUi(event.type)
    if (!type) {
      return []
    }
    return [{ type, detail: event.detail, createdAt: event.createdAt }]
  })
}

export function createInitialInterviewSnapshot(
  inviteId: string,
  publicSession?: PublicSessionDetail | null,
  fallback?: {
    accessState?: InviteAccessState
    accessMessage?: string
    policy?: Partial<InterviewPolicy>
  }
): InterviewSessionSnapshot {
  const events = publicSession ? mapEvents(publicSession.events) : []
  const inviteOpenedEvent: SessionEvent = {
    type: 'invite-opened',
    detail: 'Candidate opened the interview invite.',
    createdAt: new Date().toISOString(),
  }

  return {
    inviteId,
    sessionId: publicSession?.sessionId,
    candidateName: publicSession?.candidateName,
    templateName: publicSession?.templateName ?? 'AI Tutor Screener',
    state: publicSession?.state ?? 'ready',
    accessState:
      publicSession?.accessState ?? fallback?.accessState ?? 'available',
    accessMessage: publicSession?.accessMessage ?? fallback?.accessMessage,
    policy: {
      ...DEFAULT_INTERVIEW_POLICY,
      ...fallback?.policy,
      ...publicSession?.policy,
    },
    roomName: publicSession?.roomName,
    sessionPurpose: publicSession?.sessionPurpose,
    activeDurationMs: publicSession?.activeDurationMs ?? 0,
    events: events.length ? events : [inviteOpenedEvent],
    preflight: createDefaultPreflightSteps(),
    transcript: publicSession?.transcript ?? [],
    // Recording artifacts are recruiter-only and intentionally absent from the
    // public candidate snapshot.
    recordings: [],
  }
}

export function mergeInterviewSnapshot(
  base: InterviewSessionSnapshot,
  publicSession?: PublicSessionDetail | null
): InterviewSessionSnapshot {
  if (!publicSession) {
    return base
  }

  const events = mapEvents(publicSession.events)

  return {
    ...base,
    sessionId: publicSession.sessionId ?? base.sessionId,
    candidateName: publicSession.candidateName ?? base.candidateName,
    templateName: publicSession.templateName ?? base.templateName,
    state: publicSession.state,
    accessState: publicSession.accessState ?? base.accessState,
    accessMessage: publicSession.accessMessage ?? base.accessMessage,
    policy: {
      ...DEFAULT_INTERVIEW_POLICY,
      ...base.policy,
      ...publicSession.policy,
    },
    roomName: publicSession.roomName ?? base.roomName,
    sessionPurpose: publicSession.sessionPurpose ?? base.sessionPurpose,
    activeDurationMs: publicSession.activeDurationMs ?? base.activeDurationMs,
    events: events.length ? events : base.events,
    preflight: normalizePreflight(base.preflight),
    transcript: publicSession.transcript.length
      ? publicSession.transcript
      : base.transcript,
    // Preserve the base value for compatibility, but never hydrate recordings
    // from the invite-token public projection.
    recordings: base.recordings,
  }
}

function normalizePreflight(preflight: PreflightStep[]): PreflightStep[] {
  if (preflight.length === PRE_FLIGHT_STEPS.length) {
    return preflight
  }

  return createDefaultPreflightSteps()
}
