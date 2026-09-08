import { describe, expect, test, vi } from 'vitest'

import {
  ASSESSMENT_PROCESSING_FINISH_TIMEOUT,
  createAssessmentProcessingHandler,
  processInterviewAssessmentFunction,
} from './process-interview-assessment'

describe('assessment processing durability', () => {
  test('cancels an executing run after the provider abort window', () => {
    const registeredFunction =
      processInterviewAssessmentFunction as unknown as {
        getConfig(options: {
          baseUrl: URL
          appPrefix: string
          isConnect: boolean
        }): Array<{ timeouts?: { finish?: string } }>
      }
    const [config] = registeredFunction.getConfig({
      baseUrl: new URL('https://example.test/api/inngest'),
      appPrefix: 'kyma',
      isConnect: false,
    })

    expect(config?.timeouts).toEqual({
      finish: ASSESSMENT_PROCESSING_FINISH_TIMEOUT,
    })
  })

  test('marks the report failed before propagating a processing error', async () => {
    const processingError = new Error('provider unavailable')
    const processAssessment = vi.fn().mockRejectedValue(processingError)
    const markFailed = vi.fn().mockResolvedValue(undefined)
    const steps: string[] = []
    const handler = createAssessmentProcessingHandler({
      processAssessment,
      markFailed,
    })

    await expect(
      handler({
        event: { data: { sessionId: 'session-123' } },
        step: {
          run: async <T>(name: string, callback: () => Promise<T>) => {
            steps.push(name)
            return await callback()
          },
        },
      })
    ).rejects.toBe(processingError)

    expect(processAssessment).toHaveBeenCalledWith('session-123', 'inngest')
    expect(markFailed).toHaveBeenCalledWith(
      'session-123',
      'provider unavailable'
    )
    expect(steps).toEqual(['generate-assessment-report', 'mark-report-failed'])
  })
})
