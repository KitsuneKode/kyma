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
    timeouts: { finish: '2m' },
    triggers: {
      event: INTERVIEW_PROCESSING_REQUESTED_EVENT,
    },
  },
  async ({ event, step }) => {
    const { sessionId } = payloadSchema.parse(event.data)
    const typedSessionId = sessionId as Id<'interviewSessions'>

    try {
      // The provider call aborts after 90s. The function-level two-minute
      // deadline also cancels a run if the process or durable step hangs beyond
      // that abort window.
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
