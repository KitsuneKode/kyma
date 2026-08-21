import { describe, expect, it, test } from 'vitest'

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

describe('report engine honours template hard gates', () => {
  function thinTranscript() {
    return [
      {
        speaker: 'candidate' as const,
        text: 'I am not sure. Maybe. I guess it depends, probably.',
        status: 'final' as const,
        startedAt: '2026-08-21T10:00:00.000Z',
      },
    ]
  }

  test('a custom gated dimension can trigger the gate', () => {
    const report = buildAssessmentReport(
      {
        sessionId: 'sess_1',
        candidateName: 'Test Candidate',
        templateName: 'Custom rubric',
        transcript: thinTranscript(),
      },
      {
        dimensions: [
          { name: 'domain_depth', weight: 3, isHardGate: true },
          { name: 'warmth', weight: 1, isHardGate: false },
        ],
      }
    )

    expect(report.dimensionScores.map((item) => item.dimension)).toEqual([
      'domain_depth',
      'warmth',
    ])
    expect(report.hardGateTriggered).toBe(true)
    expect(report.overallRecommendation).toBe('no')
  })

  test('clearing a default gate stops it firing', () => {
    const report = buildAssessmentReport(
      {
        sessionId: 'sess_2',
        candidateName: 'Test Candidate',
        templateName: 'Ungated clarity',
        transcript: thinTranscript(),
      },
      { dimensions: [{ name: 'clarity', weight: 1, isHardGate: false }] }
    )

    expect(report.hardGateTriggered).toBe(false)
  })
})
