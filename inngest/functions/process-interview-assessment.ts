import { z } from 'zod'

import type { Id } from '@/convex/_generated/dataModel'
import {
  markAssessmentFailed,
  processInterviewAssessment,
} from '@/lib/assessment/process-session'

import { INTERVIEW_PROCESSING_REQUESTED_EVENT } from '@/lib/inngest/events'

import { inngest } from '../client'

const payloadSchema = z.object({
  sessionId: z.string(),
})

export const processInterviewAssessmentFunction = inngest.createFunction(
  {
    id: 'process-interview-assessment',
    name: 'Process interview assessment',
    retries: 3,
    triggers: {
      event: INTERVIEW_PROCESSING_REQUESTED_EVENT,
    },
  },
  async ({ event, step }) => {
    const { sessionId } = payloadSchema.parse(event.data)
    const typedSessionId = sessionId as Id<'interviewSessions'>

    try {
      // SCORING_TIMEOUT_MS is 90s inside generateLlmAssessmentReport; this step
      // inherits that bound. Inngest's per-step timeout is configured at the
      // function level when needed - AbortSignal covers the BYOK stall case.
      return await step.run('generate-assessment-report', async () => {
        return await processInterviewAssessment(typedSessionId, 'inngest')
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Assessment processing failed unexpectedly.'

      await step.run('mark-report-failed', async () => {
        await markAssessmentFailed(typedSessionId, message)
      })

      throw error
    }
  }
)
