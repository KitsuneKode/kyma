import { v } from 'convex/values'

import { internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import { pipelineQuery } from './lib/pipelineFunctions'
import { interviewProcessingEventId } from '../lib/inngest/events'
import { transitionSessionSafely } from '../lib/interview/session-machine'
import type { InterviewSessionState } from '../lib/interview/types'

// Sessions still in `processing` after this window are re-enqueued.
export const STUCK_AFTER_MS = 10 * 60 * 1000
// Past this window we stop retrying and mark the session failed so it never
// sticks in `processing` forever.
const GIVE_UP_AFTER_MS = 60 * 60 * 1000
const SCAN_BATCH = 50

/**
 * Reconcile interview sessions wedged in `processing`. The post-call pipeline is
 * durable (Inngest with retries), but a crashed worker, lost event, or partial
 * write can still leave a session stuck. This periodic reaper either reconciles
 * a lagging session against a terminal report, re-enqueues a recoverable one, or
 * fails it past the hard cutoff.
 */
export const reapStuckProcessingSessions = internalMutation({
  args: {},
  returns: v.object({
    scanned: v.number(),
    reconciled: v.number(),
    reEnqueued: v.number(),
    failed: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now()
    const nowIso = new Date(now).toISOString()

    const sessions = await ctx.db
      .query('interviewSessions')
      .withIndex('by_state', (q) => q.eq('state', 'processing'))
      .take(SCAN_BATCH)

    let reconciled = 0
    let reEnqueued = 0
    let failed = 0

    for (const session of sessions) {
      const anchorMs = session.endedAt
        ? Date.parse(session.endedAt)
        : session._creationTime
      const ageMs =
        now - (Number.isFinite(anchorMs) ? anchorMs : session._creationTime)

      if (ageMs < STUCK_AFTER_MS) {
        continue
      }

      const report = await ctx.db
        .query('assessmentReports')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .first()

      // Report reached a terminal state but the session never caught up.
      if (
        report &&
        (report.status === 'completed' || report.status === 'manual_review')
      ) {
        await ctx.db.patch(session._id, {
          state: transitionSessionSafely(
            session.state as InterviewSessionState,
            'completed'
          ),
        })
        reconciled += 1
        continue
      }
      if (report && report.status === 'failed') {
        await ctx.db.patch(session._id, {
          state: transitionSessionSafely(
            session.state as InterviewSessionState,
            'failed'
          ),
        })
        reconciled += 1
        continue
      }

      // Exhausted the retry window: stop and mark failed.
      if (ageMs > GIVE_UP_AFTER_MS) {
        const summary =
          'Assessment processing exceeded the maximum retry window and was marked failed by the reaper.'

        if (report) {
          await ctx.db.patch(report._id, {
            status: 'failed',
            summary: report.summary ?? summary,
            generatedAt: nowIso,
          })
        } else {
          await ctx.db.insert('assessmentReports', {
            orgId: session.orgId,
            sessionId: session._id,
            status: 'failed',
            summary,
            generatedAt: nowIso,
          })
        }

        await ctx.db.insert('sessionEvents', {
          orgId: session.orgId,
          sessionId: session._id,
          type: 'processing-failed',
          detail:
            'Post-call processing exceeded the maximum retry window; marked failed by the reaper.',
          source: 'processing-reaper',
          dedupeKey: `processing-reaper-failed:${session._id}`,
          createdAt: nowIso,
        })

        await ctx.db.patch(session._id, {
          state: transitionSessionSafely(
            session.state as InterviewSessionState,
            'failed'
          ),
          failureReason: 'processing-timeout',
        })
        failed += 1
        continue
      }

      // Recoverable: re-enqueue with a unique event id. Inngest dedupes the
      // stable finalize id, so a forced id is required to trigger a fresh run.
      await ctx.scheduler.runAfter(0, internal.processingPipeline.run, {
        sessionId: session._id,
        forceEventId: `${interviewProcessingEventId(`${session._id}`)}-reap-${now}`,
      })

      await ctx.db.insert('sessionEvents', {
        orgId: session.orgId,
        sessionId: session._id,
        type: 'processing-retried',
        detail: 'Stuck post-call processing re-enqueued by the reaper.',
        source: 'processing-reaper',
        dedupeKey: `processing-reaper-retry:${session._id}:${now}`,
        createdAt: nowIso,
      })
      reEnqueued += 1
    }

    if (sessions.length === SCAN_BATCH) {
      await ctx.scheduler.runAfter(
        0,
        internal.processingReaper.reapStuckProcessingSessions,
        {}
      )
    }

    return { scanned: sessions.length, reconciled, reEnqueued, failed }
  },
})

export const getStuckProcessingSummary = pipelineQuery({
  args: {},
  returns: v.object({
    stuckCount: v.number(),
    thresholdMinutes: v.number(),
    scanned: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now()
    const sessions = await ctx.db
      .query('interviewSessions')
      .withIndex('by_state', (q) => q.eq('state', 'processing'))
      .take(SCAN_BATCH)

    let stuckCount = 0
    for (const session of sessions) {
      const anchorMs = session.endedAt
        ? Date.parse(session.endedAt)
        : session._creationTime
      const ageMs =
        now - (Number.isFinite(anchorMs) ? anchorMs : session._creationTime)
      if (ageMs >= STUCK_AFTER_MS) {
        stuckCount += 1
      }
    }

    return {
      stuckCount,
      thresholdMinutes: STUCK_AFTER_MS / (60 * 1000),
      scanned: sessions.length,
    }
  },
})
