import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockServerEnv = vi.hoisted(() => ({
  KYMA_REVIEW_CHAT_MODEL: undefined as string | undefined,
}))

vi.mock('@/lib/env/server', () => ({
  serverEnv: mockServerEnv,
}))

import { answerRecruiterQuestion } from './report-chat'

const baseDetail = {
  candidate: { name: 'Jamie' },
  template: { name: 'Demo template' },
  report: {
    summary: 'Solid fundamentals.',
    recommendation: 'yes' as const,
    confidence: 'medium' as const,
    topStrengths: ['clarity'],
    topConcerns: ['pace'],
    dimensionScores: [
      {
        dimension: 'clarity',
        score: 4,
        rationale: 'Explained steps clearly.',
      },
    ],
  },
  transcript: [],
  evidence: [
    {
      dimension: 'clarity',
      snippet: 'Let us walk through this slowly.',
      rationale: 'Structured explanation.',
    },
  ],
}

describe('answerRecruiterQuestion fallback', () => {
  beforeEach(() => {
    mockServerEnv.KYMA_REVIEW_CHAT_MODEL = undefined
  })

  it('mentions strengths when asked', async () => {
    const answer = await answerRecruiterQuestion(
      'What are the candidate strengths?',
      baseDetail
    )

    expect(answer.text.toLowerCase()).toContain('clarity')
    expect(answer.source).toBe('fallback')
  })
})
