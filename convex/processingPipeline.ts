'use node'

import { v } from 'convex/values'

import { internalAction } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { runInterviewProcessingPipeline } from '../lib/processing/run-interview-processing-pipeline'
import { convexEnv } from '../lib/env/convex'
import {
  INTERVIEW_PROCESSING_REQUESTED_EVENT,
  interviewProcessingEventId,
} from '../lib/inngest/events'

const DEFAULT_INNGEST_EVENT_API_BASE_URL = 'https://inn.gs'

function resolveInngestEventUrl(eventKey: string): string {
  const base =
    convexEnv.INNGEST_EVENT_API_BASE_URL?.trim() ||
    DEFAULT_INNGEST_EVENT_API_BASE_URL

  return `${base.replace(/\/$/, '')}/e/${eventKey}`
}

/**
 * Enqueue post-call processing on Inngest from the Convex runtime.
 *
 * The Inngest SDK cannot be bundled into Convex (it imports `server-only` and
 * the Next.js env), so we POST directly to the Inngest event API, which is the
 * same transport `inngest.send` uses. `eventId` controls Inngest's event-level
 * dedupe: finalize uses a stable per-session id, while the reaper passes a
 * unique id to force a re-run of a stuck session.
 */
async function sendInngestProcessingEvent(
  sessionId: Id<'interviewSessions'>,
  eventId: string
): Promise<{ ids: string[] }> {
  const eventKey = convexEnv.INNGEST_EVENT_KEY?.trim()
  if (!eventKey) {
    throw new Error(
      'INNGEST_EVENT_KEY is not configured for the Convex runtime.'
    )
  }

  const response = await fetch(resolveInngestEventUrl(eventKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: eventId,
      name: INTERVIEW_PROCESSING_REQUESTED_EVENT,
      data: { sessionId: `${sessionId}` },
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `Inngest event API responded ${response.status}: ${detail || 'no body'}`
    )
  }

  return { ids: [eventId] }
}

export const run = internalAction({
  args: {
    sessionId: v.id('interviewSessions'),
    // Unique id supplied by the reaper to bypass Inngest dedupe and force a
    // fresh run of a session stuck in processing.
    forceEventId: v.optional(v.string()),
  },
  returns: v.object({
    queued: v.boolean(),
    fallback: v.boolean(),
    eventIds: v.optional(v.array(v.string())),
  }),
  handler: async (_ctx, args) => {
    const eventId =
      args.forceEventId ?? interviewProcessingEventId(`${args.sessionId}`)

    return await runInterviewProcessingPipeline(
      args.sessionId,
      {
        INNGEST_EVENT_KEY: convexEnv.INNGEST_EVENT_KEY,
        NODE_ENV: convexEnv.NODE_ENV,
      },
      (sessionId) => sendInngestProcessingEvent(sessionId, eventId)
    )
  },
})
