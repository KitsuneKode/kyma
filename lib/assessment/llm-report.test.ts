import { describe, expect, it } from 'vitest'

import { llmAssessmentReportSchema } from './llm-report-schema'
import {
  compareAssessmentReports,
  llmReportToAssessmentComputation,
  quoteExistsInTranscript,
  sanitizeLlmReportEvidence,
  validateLlmReportEvidence,
} from './llm-report'
import { buildAssessmentReport, type TranscriptEntry } from './report-engine'

const strongCandidateTranscript: TranscriptEntry[] = [
  {
    speaker: 'agent',
    text: 'Can you explain fractions to a child?',
    status: 'final',
    startedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    speaker: 'candidate',
    text: 'First, I would use a pizza example. Then we step by step cut it into equal parts because that makes the idea simple.',
    status: 'final',
    startedAt: '2026-01-01T00:00:10.000Z',
    endedAt: '2026-01-01T00:00:25.000Z',
  },
  {
    speaker: 'candidate',
    text: 'What do you think happens if we take one slice out of four? That means one fourth, so the answer is clear.',
    status: 'final',
    startedAt: '2026-01-01T00:00:30.000Z',
    endedAt: '2026-01-01T00:00:45.000Z',
  },
  {
    speaker: 'candidate',
    text: 'If that is confusing, we can try another way with blocks. Does that make sense?',
    status: 'final',
    startedAt: '2026-01-01T00:00:50.000Z',
  },
]

const weakCandidateTranscript: TranscriptEntry[] = [
  {
    speaker: 'agent',
    text: 'Please introduce yourself.',
    status: 'final',
    startedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    speaker: 'candidate',
    text: 'Um, I guess maybe I can teach.',
    status: 'final',
    startedAt: '2026-01-01T00:00:05.000Z',
  },
]

function buildSampleLlmReport() {
  return llmAssessmentReportSchema.parse({
    overallRecommendation: 'yes',
    confidence: 'high',
    summary:
      'Candidate explained fractions with clear examples and checks for understanding.',
    weightedScore: 4.1,
    hardGateTriggered: false,
    topStrengths: ['clarity', 'engagement'],
    topConcerns: ['fluency'],
    needsManualReview: false,
    dimensionScores: [
      {
        dimension: 'clarity',
        score: 5,
        rationale:
          'Used step-by-step explanation with a concrete pizza example.',
        evidence: [
          {
            quote:
              'First, I would use a pizza example. Then we step by step cut it into equal parts because that makes the idea simple.',
            rationale: 'Shows structured, child-friendly explanation.',
            startedAt: '2026-01-01T00:00:10.000Z',
          },
        ],
      },
      {
        dimension: 'engagement',
        score: 4,
        rationale: 'Asked a comprehension-check question.',
        evidence: [
          {
            quote: 'Does that make sense?',
            rationale: 'Checks student understanding.',
            startedAt: '2026-01-01T00:00:50.000Z',
          },
        ],
      },
    ],
  })
}

describe('quoteExistsInTranscript', () => {
  it('accepts exact candidate quotes from golden strong transcript', () => {
    expect(
      quoteExistsInTranscript(
        'Does that make sense?',
        strongCandidateTranscript
      )
    ).toBe(true)
    expect(
      quoteExistsInTranscript(
        'First, I would use a pizza example. Then we step by step cut it into equal parts because that makes the idea simple.',
        strongCandidateTranscript
      )
    ).toBe(true)
  })

  it('rejects quotes that are not present in transcript', () => {
    expect(
      quoteExistsInTranscript(
        'I have ten years of classroom experience.',
        strongCandidateTranscript
      )
    ).toBe(false)
    expect(
      quoteExistsInTranscript('maybe I can teach', weakCandidateTranscript)
    ).toBe(true)
    expect(
      quoteExistsInTranscript(
        'I am an expert math teacher.',
        weakCandidateTranscript
      )
    ).toBe(false)
  })
})

describe('validateLlmReportEvidence', () => {
  it('passes grounded evidence for strong transcript fixture', () => {
    const report = buildSampleLlmReport()
    const result = validateLlmReportEvidence(report, strongCandidateTranscript)

    expect(result.valid).toBe(true)
    expect(result.invalidQuotes).toHaveLength(0)
  })

  it('flags invented evidence quotes', () => {
    const report = buildSampleLlmReport()
    report.dimensionScores[0].evidence[0].quote =
      'I have coached hundreds of students with perfect scores.'

    const result = validateLlmReportEvidence(report, strongCandidateTranscript)

    expect(result.valid).toBe(false)
    expect(result.invalidQuotes).toHaveLength(1)
    expect(result.invalidQuotes[0]?.dimension).toBe('clarity')
  })
})

describe('compareAssessmentReports', () => {
  it('flags large recommendation and score disagreements', () => {
    const llmLike = buildAssessmentReport({
      sessionId: 'session-a',
      candidateName: 'Alex',
      templateName: 'AI Tutor Screener',
      transcript: strongCandidateTranscript,
      events: [
        {
          type: 'teaching-simulation-completed',
          detail: 'done',
          createdAt: '2026-01-01T00:01:00.000Z',
        },
      ],
    })

    const deterministicLike = buildAssessmentReport({
      sessionId: 'session-b',
      candidateName: 'Alex',
      templateName: 'AI Tutor Screener',
      transcript: weakCandidateTranscript,
      events: [],
    })

    const comparison = compareAssessmentReports(llmLike, deterministicLike)

    expect(comparison.hasDisagreement).toBe(true)
    expect(comparison.reasons.length).toBeGreaterThan(0)
  })

  it('accepts close agreement between reports', () => {
    const left = buildAssessmentReport({
      sessionId: 'session-a',
      candidateName: 'Alex',
      templateName: 'AI Tutor Screener',
      transcript: strongCandidateTranscript,
      events: [],
    })
    const right = {
      ...left,
      weightedScore: Number((left.weightedScore + 0.2).toFixed(2)),
    }

    const comparison = compareAssessmentReports(left, right)

    expect(comparison.hasDisagreement).toBe(false)
  })
})

describe('llmAssessmentReportSchema', () => {
  it('validates structured scoring output shape', () => {
    const parsed = buildSampleLlmReport()

    expect(parsed.overallRecommendation).toBe('yes')
    expect(parsed.dimensionScores.length).toBeGreaterThan(0)
    expect(parsed.dimensionScores[0]?.evidence.length).toBeGreaterThan(0)
  })
})

describe('sanitizeLlmReportEvidence', () => {
  it('strips invented quotes and keeps grounded evidence', () => {
    const report = buildSampleLlmReport()
    report.dimensionScores[0].evidence[0].quote =
      'I have coached hundreds of students with perfect scores.'

    const deterministic = buildAssessmentReport({
      sessionId: 'session-a',
      candidateName: 'Alex',
      templateName: 'AI Tutor Screener',
      transcript: strongCandidateTranscript,
      events: [],
    })

    const sanitized = sanitizeLlmReportEvidence(
      report,
      strongCandidateTranscript,
      deterministic
    )

    expect(
      sanitized.dimensionScores[0]?.evidence.every((item) =>
        quoteExistsInTranscript(item.quote, strongCandidateTranscript)
      )
    ).toBe(true)
    expect(sanitized.dimensionScores[0]?.evidence.length).toBeGreaterThan(0)
  })
})

describe('llmReportToAssessmentComputation', () => {
  it('maps structured LLM output into assessment computation', () => {
    const report = buildSampleLlmReport()
    const assessment = llmReportToAssessmentComputation(report, 'completed')

    expect(assessment.overallRecommendation).toBe('yes')
    expect(assessment.dimensionScores).toHaveLength(2)
    expect(assessment.evidence).toHaveLength(2)
    expect(assessment.status).toBe('completed')

    const manualReview = llmReportToAssessmentComputation(
      report,
      'manual_review'
    )
    expect(manualReview.status).toBe('manual_review')
  })
})
