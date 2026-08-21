import { describe, expect, test } from 'vitest'

import { buildAssessmentReport } from './report-engine'
import type { TranscriptEntry } from './report-engine'

/**
 * Golden-set calibration.
 *
 * These assert bands, not exact scores, so ordinary tuning stays free while a
 * change that inverts the meaning of a report fails loudly. If one of these
 * breaks, the scorer disagrees with the intent of the fixture — investigate the
 * scorer before widening the band.
 */
function turn(text: string, index: number): TranscriptEntry {
  return {
    speaker: 'candidate',
    text,
    status: 'final',
    startedAt: new Date(Date.UTC(2026, 7, 21, 10, index)).toISOString(),
  }
}

const strongCandidate: TranscriptEntry[] = [
  'Let me start with a simple example, because I find it helps to ground the idea first.',
  'So think of it as a staircase - first we take one step, then the next, and each step builds on the last.',
  'That is okay, take your time. We can try again with a different approach if this one is not landing.',
  'You mentioned earlier that fractions felt confusing, so based on that let us slice a pizza instead.',
  'What do you think would happen if we doubled the number of slices? Does that make sense so far?',
  'Another way to see it is to imagine sharing sweets between friends, which is the same idea.',
  'Great question - I am glad you asked, because that is exactly the tricky part.',
  'Therefore the answer is one half, and that means the two fractions are equivalent.',
  'Let us try one more together, step by step, and then you can do the next one yourself.',
  'For example, if we had three friends instead of two, we would split it into thirds.',
  'As you said, it is about equal parts, so that is the important thing to hold on to.',
  'In other words, the bottom number tells us how many pieces the whole is cut into.',
  'Can you tell me what you would do next? I want to check I explained that clearly.',
  'No problem at all - that is a really common mix-up and it is fine to get it wrong first time.',
].map(turn)

const weakCandidate: TranscriptEntry[] = [
  'Um, yeah, I guess so.',
  'Maybe. I am not sure.',
  'Like, you know, it just kind of works that way probably.',
].map(turn)

function reportFor(transcript: TranscriptEntry[], sessionId: string) {
  return buildAssessmentReport({
    sessionId,
    candidateName: 'Calibration Candidate',
    templateName: 'Tutor screening',
    transcript,
  })
}

describe('scoring calibration', () => {
  test('a strong teaching transcript does not produce a reject', () => {
    const report = reportFor(strongCandidate, 'calib_strong')

    expect(report.hardGateTriggered).toBe(false)
    expect(['mixed', 'yes', 'strong_yes']).toContain(
      report.overallRecommendation
    )
    expect(report.weightedScore).toBeGreaterThanOrEqual(2.75)
  })

  test('a thin uncertain transcript does not produce a hire', () => {
    const report = reportFor(weakCandidate, 'calib_weak')

    expect(['no', 'mixed']).toContain(report.overallRecommendation)
    expect(report.confidence).toBe('low')
    expect(report.status).toBe('manual_review')
  })

  test('an empty transcript is never a hire and always needs review', () => {
    const report = reportFor([], 'calib_empty')

    expect(report.overallRecommendation).toBe('no')
    expect(report.status).toBe('manual_review')
  })

  test('the strong candidate outranks the weak one', () => {
    const strong = reportFor(strongCandidate, 'calib_rank_strong')
    const weak = reportFor(weakCandidate, 'calib_rank_weak')

    expect(strong.weightedScore).toBeGreaterThan(weak.weightedScore)
  })

  test('weighted score always stays inside the 1-5 band', () => {
    for (const [index, transcript] of [
      strongCandidate,
      weakCandidate,
      [],
    ].entries()) {
      const report = reportFor(transcript, `calib_band_${index}`)

      expect(report.weightedScore).toBeGreaterThanOrEqual(1)
      expect(report.weightedScore).toBeLessThanOrEqual(5)
    }
  })

  test('every dimension score stays inside the 1-5 band', () => {
    const report = reportFor(strongCandidate, 'calib_dimension_band')

    for (const dimension of report.dimensionScores) {
      expect(dimension.score).toBeGreaterThanOrEqual(1)
      expect(dimension.score).toBeLessThanOrEqual(5)
    }
  })

  test('a custom rubric scores only its own dimensions', () => {
    const report = buildAssessmentReport(
      {
        sessionId: 'calib_custom',
        candidateName: 'Calibration Candidate',
        templateName: 'Custom rubric',
        transcript: strongCandidate,
      },
      {
        dimensions: [
          { name: 'domain_depth', weight: 2, isHardGate: false },
          { name: 'warmth', weight: 1, isHardGate: false },
        ],
      }
    )

    expect(report.dimensionScores.map((item) => item.dimension)).toEqual([
      'domain_depth',
      'warmth',
    ])
    expect(report.weightedScore).toBeGreaterThanOrEqual(1)
    expect(report.weightedScore).toBeLessThanOrEqual(5)
  })
})
