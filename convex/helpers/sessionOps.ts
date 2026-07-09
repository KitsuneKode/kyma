/** Sessions started this long ago without a report need attention. */
export const STALE_SESSION_MS = 60 * 60 * 1000

/** Invites expiring within this window are flagged as expiring soon. */
export const EXPIRING_INVITE_WINDOW_MS = 24 * 60 * 60 * 1000

/** Processing sessions that ended this long ago are treated as stuck. */
export const STUCK_PROCESSING_MS = 10 * 60 * 1000

export type SessionOpsWindows = {
  nowMs: number
  /** Exclusive lower bound: expiry must be after now. */
  expiringUntilMs: number
  /** Sessions started before this timestamp are stale. */
  staleBeforeMs: number
}

/**
 * Shared time windows for recruiter ops surfaces (dashboard + screenings).
 * Callers pass `nowMs` so Convex queries stay deterministic.
 */
export function getSessionOpsWindows(nowMs: number): SessionOpsWindows {
  return {
    nowMs,
    expiringUntilMs: nowMs + EXPIRING_INVITE_WINDOW_MS,
    staleBeforeMs: nowMs - STALE_SESSION_MS,
  }
}

/**
 * True when an invite expires after `nowMs` and on/before the 24h window end.
 */
export function isInviteExpiringSoon(
  expiresAt: string | null | undefined,
  nowMs: number,
  expiringUntilMs: number = nowMs + EXPIRING_INVITE_WINDOW_MS
): boolean {
  if (!expiresAt) {
    return false
  }
  const expiry = Date.parse(expiresAt)
  return Number.isFinite(expiry) && expiry > nowMs && expiry <= expiringUntilMs
}

/**
 * True when a session started long enough ago and still has no assessment report.
 */
export function isStaleSessionWithoutReport(
  startedAt: string | null | undefined,
  staleBeforeMs: number,
  hasReport: boolean
): boolean {
  if (!startedAt || hasReport) {
    return false
  }
  const startedMs = Date.parse(startedAt)
  return Number.isFinite(startedMs) && startedMs < staleBeforeMs
}

/**
 * True when a session has been in `processing` past the stuck threshold.
 */
export function isStuckProcessing(
  state: string | null | undefined,
  endedAt: string | null | undefined,
  nowMs: number,
  stuckAfterMs: number = STUCK_PROCESSING_MS
): boolean {
  if (state !== 'processing' || !endedAt) {
    return false
  }
  const endedMs = Date.parse(endedAt)
  return Number.isFinite(endedMs) && nowMs - endedMs >= stuckAfterMs
}
