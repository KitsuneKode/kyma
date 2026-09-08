/** Sessions started this long ago without a report need attention. */
export const STALE_SESSION_MS = 60 * 60 * 1000

/** Invites expiring within this window are flagged as expiring soon. */
export const EXPIRING_INVITE_WINDOW_MS = 24 * 60 * 60 * 1000

/** Processing sessions that ended this long ago are treated as stuck. */
export const STUCK_PROCESSING_MS = 10 * 60 * 1000

/** Largest timestamp accepted by the JavaScript Date specification. */
export const MAX_DATE_TIMESTAMP_MS = 8_640_000_000_000_000

export type SessionOpsWindows = {
  nowMs: number
  /** Exclusive lower bound: expiry must be after now. */
  expiringUntilMs: number
  /** Sessions started before this timestamp are stale. */
  staleBeforeMs: number
}

/**
 * Validate caller-supplied time without consulting wall clock state inside a
 * reactive Convex query. The value only affects the caller's operational view;
 * authoritative expiry and lifecycle writes remain mutation-owned.
 */
export function requireValidQueryNowMs(nowMs: number): number {
  if (
    !Number.isSafeInteger(nowMs) ||
    nowMs < 0 ||
    nowMs > MAX_DATE_TIMESTAMP_MS
  ) {
    throw new Error('nowMs must be a valid non-negative Date timestamp.')
  }
  return nowMs
}

/**
 * Shared time windows for recruiter ops surfaces (dashboard + screenings).
 * Callers pass `nowMs` so Convex queries stay deterministic.
 */
export function getSessionOpsWindows(nowMs: number): SessionOpsWindows {
  const validNowMs = requireValidQueryNowMs(nowMs)
  return {
    nowMs: validNowMs,
    expiringUntilMs: validNowMs + EXPIRING_INVITE_WINDOW_MS,
    staleBeforeMs: validNowMs - STALE_SESSION_MS,
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
