import { describe, expect, it } from 'vitest'

import { buildAssessmentReport } from './report-engine'

describe('buildAssessmentReport', () => {
  it('returns a structured report for minimal transcript', () => {
    const result = buildAssessmentReport({
      sessionId: 'test-session',
      candidateName: 'Alex',
      templateName: 'AI Tutor Screener',
      transcript: [
        {
          speaker: 'agent',
          text: 'Welcome to the interview.',
          status: 'final',
          startedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          speaker: 'candidate',
          text: 'Thank you, happy to be here.',
          status: 'final',
          startedAt: '2026-01-01T00:00:05.000Z',
        },
      ],
      events: [],
    })

    expect(result.status).toBeDefined()
    expect(result.dimensionScores.length).toBeGreaterThan(0)
    expect(result.summary.length).toBeGreaterThan(0)
  })
})
