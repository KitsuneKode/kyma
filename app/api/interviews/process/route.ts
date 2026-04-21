import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import type { Id } from "@/convex/_generated/dataModel"
import {
  markAssessmentFailed,
  markAssessmentProcessing,
  processInterviewAssessment,
} from "@/lib/assessment/process-session"
import {
  createDiagnosticLogger,
  createRequestId,
} from "@/lib/interview/diagnostics"
import { inngest } from "@/inngest/client"

export const dynamic = "force-dynamic"
export const revalidate = 0

const bodySchema = z.object({
  sessionId: z.string(),
})

export async function POST(request: NextRequest) {
  const requestId = createRequestId("process")
  const logger = createDiagnosticLogger("processing-route", {
    actor: "server",
    requestId,
  })

  try {
    const json = await request.json()
    const { sessionId } = bodySchema.parse(json)
    const typedSessionId = sessionId as Id<"interviewSessions">

    await markAssessmentProcessing(typedSessionId)

    try {
      const result = await inngest.send({
        id: `interview-processing-${sessionId}`,
        name: "kyma/interview.processing.requested",
        data: { sessionId },
      })

      logger.info({
        event: "processing.enqueued",
        detail: "Interview processing was queued in Inngest.",
        sessionId,
        meta: {
          eventIds: result.ids,
        },
      })

      return NextResponse.json({
        ok: true,
        queued: true,
        eventIds: result.ids,
      })
    } catch (enqueueError) {
      logger.warn({
        event: "processing.enqueue.failed",
        detail:
          "Unable to enqueue interview processing in Inngest. Falling back to inline processing.",
        sessionId,
        error: enqueueError,
      })

      const report = await processInterviewAssessment(typedSessionId, "inline")

      return NextResponse.json({
        ok: true,
        queued: false,
        fallback: true,
        recommendation: report.overallRecommendation,
        confidence: report.confidence,
      })
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to start interview processing."
    const sessionId =
      error instanceof z.ZodError
        ? undefined
        : (await request
            .clone()
            .json()
            .then((body) => body?.sessionId as string | undefined)
            .catch(() => undefined))

    if (sessionId) {
      await markAssessmentFailed(
        sessionId as Id<"interviewSessions">,
        `Assessment processing could not be started: ${message}`
      ).catch(() => null)
    }

    return NextResponse.json({ error: message }, { status: 400 })
  }
}
