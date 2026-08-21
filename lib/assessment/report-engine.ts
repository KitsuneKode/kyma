import type { RubricConfig } from './llm-report-schema'
import {
  DIMENSION_LABELS,
  isRubricDimension,
  type RubricDimension,
} from '../rubric/constants'
import {
  type Confidence,
  type Recommendation,
  deriveAssessmentOutcome,
} from './scoring-policy'
import { resolveRubricDimensions } from '@/lib/rubric/resolve-rubric'

export {
  DIMENSION_LABELS,
  DIMENSION_WEIGHTS,
  RUBRIC_DIMENSIONS,
  type RubricDimension,
} from '../rubric/constants'
export type { Recommendation, Confidence } from './scoring-policy'
export { REPORT_STATUSES, type ReportStatus } from '@/lib/domain/report-status'

import type { ReportStatus } from '@/lib/domain/report-status'

export type TranscriptEntry = {
  speaker: 'agent' | 'candidate' | 'system'
  text: string
  status: 'partial' | 'final'
  startedAt: string
  endedAt?: string
}

export type CandidateReviewInput = {
  sessionId: string
  candidateName: string
  templateName: string
  transcript: TranscriptEntry[]
  events?: Array<{
    type: string
    detail: string
    createdAt: string
  }>
}

export type DimensionScore = {
  dimension: string
  score: number
  rationale: string
}

export type DimensionEvidence = {
  dimension: string
  snippet: string
  rationale: string
  startedAt?: string
  endedAt?: string
}

export type AssessmentComputation = {
  status: ReportStatus
  overallRecommendation: Recommendation
  confidence: Confidence
  summary: string
  weightedScore: number
  hardGateTriggered: boolean
  topStrengths: string[]
  topConcerns: string[]
  transcriptQualityNote?: string
  dimensionScores: DimensionScore[]
  evidence: DimensionEvidence[]
}

type AssessmentContext = {
  teachingSimulationStarted: boolean
  teachingSimulationCompleted: boolean
  candidateSharedScreen: boolean
}

type CandidateSegment = TranscriptEntry & { speaker: 'candidate' }

const KEYWORDS: Record<RubricDimension, string[]> = {
  clarity: ['first', 'then', 'because', 'so that', 'step', 'important'],
  simplification: [
    'for example',
    'imagine',
    'think of it as',
    'step by step',
    'simple',
    "let's say",
  ],
  patience: [
    "that's okay",
    'no problem',
    'take your time',
    'we can',
    "let's try again",
    "it's fine",
  ],
  warmth: [
    'welcome',
    'glad',
    'happy',
    'absolutely',
    'of course',
    'great question',
  ],
  listening: [
    'you mentioned',
    'as you said',
    "what you're saying",
    'your question',
    'based on that',
  ],
  fluency: ['because', 'therefore', 'for example', 'in other words'],
  adaptability: [
    'another way',
    'different way',
    'alternatively',
    'if not',
    'we can also',
  ],
  engagement: [
    'what do you think',
    'can you tell me',
    'how would you',
    "let's try",
    'does that make sense',
  ],
  accuracy: ['because', 'therefore', 'that means', 'so the answer'],
}

const FILLERS = ['um', 'uh', 'like', 'you know', 'sort of', 'kind of']
const UNCERTAINTY = ['maybe', 'i guess', "i'm not sure", 'probably', 'not sure']

function clampScore(score: number) {
  return Math.max(1, Math.min(5, Math.round(score)))
}

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function includesAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern))
}

function countMatches(text: string, patterns: string[]) {
  return patterns.reduce(
    (total, pattern) => total + (text.includes(pattern) ? 1 : 0),
    0
  )
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function buildDimensionRationale(
  dimension: RubricDimension,
  score: number,
  context: {
    candidateTurns: number
    candidateWords: number
    markerCount: number
    fillerRate: number
    uncertaintyCount: number
  }
) {
  const parts = [
    `The ${DIMENSION_LABELS[dimension]} signal scored ${score}/5 based on the live transcript.`,
  ]

  if (context.markerCount > 0) {
    parts.push(
      `The candidate showed ${context.markerCount} strong ${DIMENSION_LABELS[dimension]} markers in their phrasing.`
    )
  }

  if (dimension === 'fluency') {
    parts.push(
      context.fillerRate > 0.08
        ? 'The transcript contains enough filler language to lower fluency confidence.'
        : 'The transcript shows relatively steady spoken fluency with limited filler language.'
    )
  }

  if (dimension === 'accuracy' && context.uncertaintyCount > 0) {
    parts.push(
      'The candidate used uncertain language in explanation-heavy turns, so this dimension remains conservative.'
    )
  }

  if (context.candidateTurns < 6 || context.candidateWords < 120) {
    parts.push(
      'Transcript coverage is still limited, so this score should be treated as first-pass evidence.'
    )
  }

  return parts.join(' ')
}

function pickEvidence(
  segments: CandidateSegment[],
  dimension: string,
  keywords: string[]
): DimensionEvidence | null {
  const scoredSegments = segments
    .map((segment) => {
      const text = normalize(segment.text)
      const keywordScore = countMatches(text, keywords)
      const lengthScore = Math.min(countWords(segment.text) / 12, 2)
      const uncertaintyPenalty = includesAny(text, UNCERTAINTY) ? 1 : 0

      return {
        segment,
        score: keywordScore + lengthScore - uncertaintyPenalty,
      }
    })
    .toSorted((left, right) => right.score - left.score)

  const best = scoredSegments[0]

  if (!best || best.score <= 0) {
    return null
  }

  return {
    dimension,
    snippet: best.segment.text,
    rationale: `Representative transcript evidence for ${isRubricDimension(dimension) ? DIMENSION_LABELS[dimension] : dimension}.`,
    startedAt: best.segment.startedAt,
    endedAt: best.segment.endedAt,
  }
}

function computeDimensionScore(
  dimension: string,
  keywords: string[],
  segments: CandidateSegment[],
  candidateTurns: number,
  candidateWords: number
) {
  const normalizedTranscript = normalize(
    segments.map((segment) => segment.text).join(' ')
  )
  const avgWords = average(segments.map((segment) => countWords(segment.text)))
  const markerCount = countMatches(normalizedTranscript, keywords)
  const fillerCount = countMatches(normalizedTranscript, FILLERS)
  const uncertaintyCount = countMatches(normalizedTranscript, UNCERTAINTY)
  const fillerRate = candidateWords > 0 ? fillerCount / candidateWords : 0

  let score = 3

  if (candidateTurns < 4 || candidateWords < 80) {
    score -= 1
  }

  if (markerCount >= 3) {
    score += 1
  } else if (markerCount === 0) {
    score -= 0.5
  }

  if (isRubricDimension(dimension) && dimension === 'clarity') {
    if (avgWords >= 10 && avgWords <= 35) {
      score += 0.5
    }
    if (avgWords < 5 || avgWords > 55) {
      score -= 0.75
    }
  }

  if (isRubricDimension(dimension) && dimension === 'fluency') {
    if (fillerRate > 0.08) {
      score -= 1
    } else if (fillerRate < 0.03 && avgWords >= 8) {
      score += 0.5
    }
  }

  if (isRubricDimension(dimension) && dimension === 'accuracy') {
    if (uncertaintyCount >= 3) {
      score -= 1
    } else if (uncertaintyCount === 0 && markerCount >= 2) {
      score += 0.5
    }
  }

  if (isRubricDimension(dimension) && dimension === 'engagement') {
    const questionCount = segments.filter((segment) =>
      segment.text.includes('?')
    ).length

    if (questionCount >= 2) {
      score += 0.5
    }
  }

  const clampedScore = clampScore(score)

  return {
    dimension,
    score: clampedScore,
    rationale: buildDimensionRationale(
      isRubricDimension(dimension) ? dimension : 'clarity',
      clampedScore,
      {
        candidateTurns,
        candidateWords,
        markerCount,
        fillerRate,
        uncertaintyCount,
      }
    ),
    evidence: pickEvidence(segments, dimension, keywords),
  }
}

function describeTranscriptQuality(
  candidateTurns: number,
  candidateWords: number
) {
  if (candidateTurns < 4 || candidateWords < 80) {
    return 'Transcript coverage is too limited for a confident hiring recommendation.'
  }

  if (candidateTurns < 8 || candidateWords < 180) {
    return 'Transcript coverage is usable but still thin, so the report should be treated as first-pass evidence.'
  }

  return undefined
}

function pickTopDimensions(
  dimensionScores: DimensionScore[],
  direction: 'high' | 'low'
) {
  const sorted = [...dimensionScores].toSorted((left, right) =>
    direction === 'high' ? right.score - left.score : left.score - right.score
  )

  return sorted.slice(0, 3).map((item) => item.dimension.replaceAll('_', ' '))
}

function deriveAssessmentContext(
  events: CandidateReviewInput['events'] = []
): AssessmentContext {
  return {
    teachingSimulationStarted: events.some(
      (event) => event.type === 'teaching-simulation-started'
    ),
    teachingSimulationCompleted: events.some(
      (event) => event.type === 'teaching-simulation-completed'
    ),
    candidateSharedScreen: events.some(
      (event) => event.type === 'candidate-screen-share-started'
    ),
  }
}

export function buildAssessmentReport(
  input: CandidateReviewInput,
  rubricConfig?: RubricConfig
): AssessmentComputation {
  const assessmentContext = deriveAssessmentContext(input.events)
  const candidateSegments = input.transcript.filter(
    (segment): segment is CandidateSegment =>
      segment.speaker === 'candidate' && segment.status === 'final'
  )
  const candidateTurns = candidateSegments.length
  const candidateWords = candidateSegments.reduce(
    (total, segment) => total + countWords(segment.text),
    0
  )

  // Weights and hard gates come from the shared resolver so the engine, the
  // scoring policy and the review UI cannot drift apart. Only keyword hints
  // stay local to this deterministic scorer.
  const configuredKeywords = new Map(
    (rubricConfig?.dimensions ?? [])
      .filter((dimension) => (dimension.keywords?.length ?? 0) > 0)
      .map((dimension) => [dimension.name.trim(), dimension.keywords ?? []])
  )
  const dimensionDefinitions = resolveRubricDimensions(rubricConfig).map(
    (dimension) => ({
      ...dimension,
      keywords:
        configuredKeywords.get(dimension.name) ??
        (isRubricDimension(dimension.name)
          ? KEYWORDS[dimension.name]
          : ['because', 'example', 'step', 'understand']),
    })
  )

  const scoredDimensions = dimensionDefinitions.map((definition) =>
    computeDimensionScore(
      definition.name,
      definition.keywords,
      candidateSegments,
      candidateTurns,
      candidateWords
    )
  )
  const dimensionScores: DimensionScore[] = scoredDimensions.map((item) => ({
    dimension: item.dimension,
    score: item.score,
    rationale: item.rationale,
  }))
  const evidence = scoredDimensions
    .map((item) => item.evidence)
    .filter((item): item is DimensionEvidence => Boolean(item))

  const transcriptQualityNote = describeTranscriptQuality(
    candidateTurns,
    candidateWords
  )

  let confidence: Confidence = 'high'
  if (candidateTurns < 12 || candidateWords < 300 || evidence.length < 5) {
    confidence = 'medium'
  }
  if (candidateTurns < 6 || candidateWords < 140 || evidence.length < 3) {
    confidence = 'low'
  }

  const { weightedScore, hardGateTriggered, overallRecommendation } =
    deriveAssessmentOutcome({
      dimensionScores,
      dimensions: dimensionDefinitions,
      confidence,
    })

  const topStrengths = pickTopDimensions(dimensionScores, 'high')
  const topConcerns = pickTopDimensions(dimensionScores, 'low')

  const status: ReportStatus =
    confidence === 'low' ? 'manual_review' : 'completed'

  const simulationSummary = assessmentContext.teachingSimulationCompleted
    ? assessmentContext.candidateSharedScreen
      ? 'The session included a completed child-persona teaching simulation with candidate screen sharing, which gives reviewers stronger evidence about live teaching behavior.'
      : 'The session included a completed child-persona teaching simulation, which gives reviewers stronger evidence about live teaching behavior.'
    : assessmentContext.teachingSimulationStarted
      ? 'A child-persona teaching simulation started but did not fully complete, so teaching evidence should be interpreted conservatively.'
      : 'The session did not include the teaching simulation segment, so this report leans more heavily on conversational evidence than live teaching evidence.'

  const summary = [
    `${input.candidateName} completed the ${input.templateName} screening with a ${overallRecommendation.replaceAll('_', ' ')} recommendation and ${confidence} confidence.`,
    hardGateTriggered
      ? 'A hard gate was triggered, so this result should be treated as a likely reject unless a recruiter finds counter-evidence.'
      : `The strongest visible dimensions were ${topStrengths.join(', ')}.`,
    `Primary follow-up areas are ${topConcerns.join(', ')}.`,
    simulationSummary,
    transcriptQualityNote ??
      'Transcript coverage was strong enough for a first-pass recommendation.',
  ].join(' ')

  return {
    status,
    overallRecommendation,
    confidence,
    summary,
    weightedScore,
    hardGateTriggered,
    topStrengths,
    topConcerns,
    transcriptQualityNote,
    dimensionScores,
    evidence,
  }
}
