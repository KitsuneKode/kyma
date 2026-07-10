import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchQuery = vi.fn()
const fetchMutation = vi.fn()

vi.mock('convex/nextjs', () => ({
  fetchQuery: (...args: unknown[]) => fetchQuery(...args),
  fetchMutation: (...args: unknown[]) => fetchMutation(...args),
}))

vi.mock('@/lib/env/server', () => ({
  serverEnv: {
    KYMA_PROCESSING_WRITE_KEY: 'test-processing-key',
  },
}))

import { markAssessmentProcessing } from './process-session'
import type { Id } from '@/convex/_generated/dataModel'

const SESSION_ID = 'jd7session000000000000000000' as Id<'interviewSessions'>

describe('markAssessmentProcessing', () => {
  beforeEach(() => {
    fetchQuery.mockReset()
    fetchMutation.mockReset()
  })

  it('writes processing when no report exists', async () => {
    fetchQuery.mockResolvedValueOnce({ report: null })

    await markAssessmentProcessing(SESSION_ID)

    expect(fetchMutation).toHaveBeenCalledTimes(1)
    expect(fetchMutation.mock.calls[0]?.[1]).toMatchObject({
      status: 'processing',
    })
  })

  it('early-returns when report is already processing', async () => {
    fetchQuery.mockResolvedValueOnce({
      report: { status: 'processing' },
    })

    await markAssessmentProcessing(SESSION_ID)

    expect(fetchMutation).not.toHaveBeenCalled()
  })

  it('early-returns when report is completed', async () => {
    fetchQuery.mockResolvedValueOnce({
      report: { status: 'completed' },
    })

    await markAssessmentProcessing(SESSION_ID)

    expect(fetchMutation).not.toHaveBeenCalled()
  })

  it('early-returns when report is manual_review', async () => {
    fetchQuery.mockResolvedValueOnce({
      report: { status: 'manual_review' },
    })

    await markAssessmentProcessing(SESSION_ID)

    expect(fetchMutation).not.toHaveBeenCalled()
  })
})
