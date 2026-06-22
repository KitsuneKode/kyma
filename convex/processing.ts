import { v } from 'convex/values'

import { internalAction } from './_generated/server'
import { isDevelopmentMode } from '../lib/runtime-mode'
import { runtimeEnv } from '../lib/env/runtime'
import {
  INTERVIEW_PROCESSING_REQUESTED_EVENT,
  interviewProcessingEventId,
} from '../lib/inngest/events'

export const enqueueInterviewProcessing = internalAction({
  args: {
    sessionId: v.id('interviewSessions'),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const eventKey = runtimeEnv.INNGEST_EVENT_KEY?.trim()
    if (!eventKey) {
      if (!isDevelopmentMode(runtimeEnv.NODE_ENV)) {
        console.error(
          'INNGEST_EVENT_KEY is required to enqueue interview processing.'
        )
      }
      return null
    }

    const ingestBaseUrl = isDevelopmentMode(runtimeEnv.NODE_ENV)
      ? 'http://127.0.0.1:8288'
      : 'https://inn.gs'

    const response = await fetch(`${ingestBaseUrl}/e/${eventKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: INTERVIEW_PROCESSING_REQUESTED_EVENT,
        data: { sessionId: args.sessionId },
        id: interviewProcessingEventId(args.sessionId),
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error(
        'Failed to enqueue interview processing via Inngest.',
        response.status,
        body
      )
    }

    return null
  },
})
