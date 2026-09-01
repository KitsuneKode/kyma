import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchMutation, fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import {
  createDiagnosticLogger,
  createRequestId,
} from '@/lib/interview/diagnostics'
import { assertServerRateLimit } from '@/lib/http/server-rate-limit'
import { runInterviewProcessingPipeline } from '@/lib/processing/run-interview-processing-pipeline'
import { serverEnv } from '@/lib/env/server'
import { inngest } from '@/inngest/client'
import {
  INTERVIEW_PROCESSING_REQUESTED_EVENT,
  interviewProcessingEventId,
} from '@/lib/inngest/events'
import { reportError } from '@/lib/ops/error-reporting'

const bodySchema = z.object({
  sessionId: z.string(),
  inviteToken: z.string().min(1),
})

/**
 * Public processing entry. After invite/session access checks, always goes
 * through finalize (`requestInterviewProcessing`) so the session machine owns
 * the transition before any assessment enqueue. Fresh transitions rely on the
 * Convex-scheduled pipeline; already-`processing` sessions re-enter via the
 * shared Inngest/inline helper.
 */
export async function POST(request: NextRequest) {
  const requestId = createRequestId('process')
  const logger = createDiagnosticLogger('processing-route', {
    actor: 'server',
    requestId,
  })
  let sessionIdForFailure: string | undefined
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  try {
    await assertServerRateLimit('publicSnapshot', `process:${clientIp}`)

    const json = await request.json()
    const { sessionId, inviteToken } = bodySchema.parse(json)
    sessionIdForFailure = sessionId
    const typedSessionId = sessionId as Id<'interviewSessions'>
    const allowed = await fetchQuery(
      api.interviews.public.verifyPublicSessionProcessingAccess,
      {
        inviteToken,
        sessionId: typedSessionId,
      }
    )
    if (!allowed) {
      return NextResponse.json(
        { error: 'Session processing access denied for this invite.' },
        { status: 403 }
      )
    }

    // Trusted finalize path (same helper as agent complete). Uses the
    // processing key so recovery still works after the invite is completed.
    const finalize = await fetchMutation(
      api.agentConfig.requestInterviewProcessing,
      {
        processingKey: serverEnv.KYMA_PROCESSING_WRITE_KEY,
        sessionId: typedSessionId,
        detail:
          'Public process route requested post-call processing after access check.',
      }
    )

    if (!finalize.queued && !finalize.transitioned) {
      return NextResponse.json(
        { error: 'Interview cannot be submitted from its current state.' },
        { status: 409 }
      )
    }

    // Fresh transition: finalize already scheduled `processingPipeline.run`.
    if (finalize.transitioned) {
      logger.info({
        event: 'processing.finalized',
        detail:
          'Session transitioned to processing; Convex pipeline was scheduled by finalize.',
        sessionId,
        meta: {
          finalizeQueued: finalize.queued,
          finalizeTransitioned: finalize.transitioned,
        },
      })

      return NextResponse.json({
        ok: true,
        queued: true,
        fallback: false,
        transitioned: true,
      })
    }

    // Recovery for sessions already in `processing`.
    const result = await runInterviewProcessingPipeline(
      typedSessionId,
      {
        INNGEST_EVENT_KEY: serverEnv.INNGEST_EVENT_KEY,
        NODE_ENV: serverEnv.NODE_ENV,
      },
      async (id) => {
        return await inngest.send({
          id: interviewProcessingEventId(id),
          name: INTERVIEW_PROCESSING_REQUESTED_EVENT,
          data: { sessionId: id },
        })
      }
    )

    logger.info({
      event: result.fallback
        ? 'processing.inline.completed'
        : 'processing.enqueued',
      detail: result.fallback
        ? 'Interview processing completed inline after enqueue was unavailable.'
        : 'Interview processing was queued in Inngest.',
      sessionId,
      meta: {
        eventIds: result.eventIds,
        finalizeQueued: finalize.queued,
        finalizeTransitioned: finalize.transitioned,
      },
    })

    return NextResponse.json({
      ok: true,
      queued: result.queued,
      fallback: result.fallback,
      eventIds: result.eventIds,
      transitioned: false,
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to start interview processing.'

    logger.error({
      event: 'processing.failed',
      detail: message,
      sessionId: sessionIdForFailure,
      error,
    })

    await reportError(error, {
      route: '/api/interviews/process',
      requestId,
      tags: { surface: 'interview-process' },
      extra: { sessionId: sessionIdForFailure },
    })

    const status = message === 'RATE_LIMITED' ? 429 : 400

    return NextResponse.json(
      {
        error:
          status === 429
            ? message
            : 'Unable to submit this interview right now. Please try again.',
        requestId,
      },
      { status }
    )
  }
}
