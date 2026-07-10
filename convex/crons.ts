import { cronJobs } from 'convex/server'

import { internal } from './_generated/api'

const crons = cronJobs()

// Reconcile interview sessions stuck in `processing` so post-call assessment
// never silently sticks when a worker crashes or an Inngest event is lost.
crons.interval(
  'reap-stuck-interview-processing',
  { minutes: 5 },
  internal.processingReaper.reapStuckProcessingSessions,
  {}
)

// Finalize or fail sessions that never left connecting/live/interrupted.
crons.interval(
  'reap-stale-pre-processing-sessions',
  { minutes: 15 },
  internal.processingReaper.reapStalePreProcessingSessions,
  {}
)

export default crons
