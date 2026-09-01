import type { Id } from '../../convex/_generated/dataModel'
import {
  markAssessmentFailed,
  markAssessmentProcessing,
  processInterviewAssessment,
} from '../assessment/process-session'
import { isProductionDeployment } from '../env/deployment-mode'

type ProcessingPipelineEnv = {
  INNGEST_EVENT_KEY?: string
  NODE_ENV?: string
  KYMA_DEPLOYMENT_ENV?: string
}

type ProcessingEnqueue = (
  sessionId: Id<'interviewSessions'>
) => Promise<{ ids: string[] }>

export type InterviewProcessingPipelineResult = {
  queued: boolean
  fallback: boolean
  eventIds?: string[]
}

export async function runInterviewProcessingPipeline(
  sessionId: Id<'interviewSessions'>,
  env: ProcessingPipelineEnv = {},
  enqueue?: ProcessingEnqueue
): Promise<InterviewProcessingPipelineResult> {
  await markAssessmentProcessing(sessionId)

  const eventKey = env.INNGEST_EVENT_KEY?.trim()
  if (eventKey && enqueue) {
    try {
      const result = await enqueue(sessionId)

      return {
        queued: true,
        fallback: false,
        eventIds: result.ids,
      }
    } catch (error) {
      if (
        isProductionDeployment({
          deploymentEnv: env.KYMA_DEPLOYMENT_ENV,
          nodeEnv: env.NODE_ENV,
        })
      ) {
        console.error(
          'Failed to enqueue interview processing via Inngest. Falling back to inline processing.',
          error
        )
      }
    }
  } else if (
    isProductionDeployment({
      deploymentEnv: env.KYMA_DEPLOYMENT_ENV,
      nodeEnv: env.NODE_ENV,
    })
  ) {
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
