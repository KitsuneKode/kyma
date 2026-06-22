import type { Id } from '../../convex/_generated/dataModel'
import {
  markAssessmentFailed,
  markAssessmentProcessing,
  processInterviewAssessment,
} from '../assessment/process-session'
import { inngest } from '../../inngest/client'
import {
  INTERVIEW_PROCESSING_REQUESTED_EVENT,
  interviewProcessingEventId,
} from '../inngest/events'
import { runtimeEnv } from '../env/runtime'
import { isDevelopmentMode } from '../runtime-mode'

export type InterviewProcessingPipelineResult = {
  queued: boolean
  fallback: boolean
  eventIds?: string[]
}

export async function runInterviewProcessingPipeline(
  sessionId: Id<'interviewSessions'>
): Promise<InterviewProcessingPipelineResult> {
  await markAssessmentProcessing(sessionId)

  const eventKey = runtimeEnv.INNGEST_EVENT_KEY?.trim()
  if (eventKey) {
    try {
      const result = await inngest.send({
        id: interviewProcessingEventId(sessionId),
        name: INTERVIEW_PROCESSING_REQUESTED_EVENT,
        data: { sessionId },
      })

      return {
        queued: true,
        fallback: false,
        eventIds: result.ids,
      }
    } catch (error) {
      if (!isDevelopmentMode(runtimeEnv.NODE_ENV)) {
        console.error(
          'Failed to enqueue interview processing via Inngest. Falling back to inline processing.',
          error
        )
      }
    }
  } else if (!isDevelopmentMode(runtimeEnv.NODE_ENV)) {
    console.error(
      'INNGEST_EVENT_KEY is required to enqueue interview processing.'
    )
  }

  try {
    await processInterviewAssessment(sessionId, 'inline')
    return {
      queued: false,
      fallback: true,
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Assessment processing failed unexpectedly.'

    await markAssessmentFailed(sessionId, message)
    throw error
  }
}
