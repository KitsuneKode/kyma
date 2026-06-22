/**
 * Shared constants and classification for LiveKit agent worker liveness.
 * Used by the worker (heartbeat cadence) and by the operator health check
 * (staleness threshold) so the two never drift apart.
 */

export const WORKER_HEARTBEAT_INTERVAL_MS = 15_000

/** A worker is considered stale after roughly three missed heartbeats. */
export const WORKER_STALE_AFTER_MS = WORKER_HEARTBEAT_INTERVAL_MS * 3

export type WorkerLivenessStatus = 'ok' | 'warn' | 'error' | 'unknown'

export function classifyWorkerLiveness(args: {
  mostRecentSeenAt: number | null
  now: number
  isProd: boolean
}): { status: WorkerLivenessStatus; detail: string } {
  const { mostRecentSeenAt, now, isProd } = args

  if (mostRecentSeenAt === null) {
    return {
      status: isProd ? 'error' : 'warn',
      detail:
        'No agent worker heartbeat recorded yet. Run bun run agent:start so interviews can connect.',
    }
  }

  const ageMs = now - mostRecentSeenAt
  if (ageMs > WORKER_STALE_AFTER_MS) {
    const ageSec = Math.round(ageMs / 1000)
    return {
      status: isProd ? 'error' : 'warn',
      detail: `Last agent worker heartbeat was ${ageSec}s ago (stale). The worker may be down.`,
    }
  }

  const ageSec = Math.round(ageMs / 1000)
  return {
    status: 'ok',
    detail: `Agent worker healthy — last heartbeat ${ageSec}s ago.`,
  }
}
