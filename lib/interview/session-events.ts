import {
  SESSION_EVENT_TYPES,
  type SessionEventType,
} from '@/lib/interview/types'

const UI_EVENT_TYPES = new Set<SessionEventType>(SESSION_EVENT_TYPES)

/**
 * Raw LiveKit/webhook vocabulary (stored verbatim as `sessionEvents.type`)
 * mapped onto the candidate-facing event union. Anything not listed here and
 * not already a UI event type has no candidate-facing meaning.
 */
const DB_EVENT_ALIASES: Record<string, SessionEventType> = {
  participant_joined: 'participant-joined',
  participant_left: 'participant-left',
  participant_connection_aborted: 'participant-left',
}

/**
 * Single source of truth translating a stored `sessionEvents.type` (which may
 * be UI vocabulary written by the candidate client or raw LiveKit/operational
 * vocabulary written by webhooks) into the candidate-facing event union.
 *
 * Operational events (room/egress lifecycle, agent churn) that carry no
 * candidate-facing meaning return `null` so callers can drop them instead of
 * mislabelling them.
 */
export function mapDbEventTypeToUi(dbType: string): SessionEventType | null {
  if (UI_EVENT_TYPES.has(dbType as SessionEventType)) {
    return dbType as SessionEventType
  }

  return DB_EVENT_ALIASES[dbType] ?? null
}
