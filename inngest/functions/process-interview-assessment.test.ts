import { describe, expect, test } from 'vitest'

import { processInterviewAssessmentFunction } from './process-interview-assessment'

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

    expect(config?.timeouts).toEqual({ finish: '2m' })
  })
})
