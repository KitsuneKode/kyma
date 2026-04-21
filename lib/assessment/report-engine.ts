export const RUBRIC_DIMENSIONS = [
  "clarity",
  "simplification",
  "patience",
  "warmth",
  "listening",
  "fluency",
  "adaptability",
  "engagement",
  "accuracy",
] as const

export type RubricDimension = (typeof RUBRIC_DIMENSIONS)[number]
export type Recommendation = "strong_yes" | "yes" | "mixed" | "no"
export type Confidence = "high" | "medium" | "low"
export type ReportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "manual_review"

export type TranscriptEntry = {
  speaker: "agent" | "candidate" | "system"
  text: string
  status: "partial" | "final"
  startedAt: string
  endedAt?: string
}

export type CandidateReviewInput = {
  sessionId: string
  candidateName: string
  templateName: string
  transcript: TranscriptEntry[]
}

export type DimensionScore = {
  dimension: RubricDimension
  score: number
  rationale: string
}

export type DimensionEvidence = {
  dimension: RubricDimension
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

type CandidateSegment = TranscriptEntry & { speaker: "candidate" }

const DIMENSION_LABELS: Record<RubricDimension, string> = {
  clarity: "clarity",
  simplification: "simplification",
  patience: "patience",
  warmth: "warmth",
  listening: "listening",
  fluency: "fluency",
  adaptability: "adaptability",
  engagement: "engagement",
  accuracy: "accuracy",
}

const DIMENSION_WEIGHTS: Record<RubricDimension, number> = {
  clarity: 0.2,
  simplification: 0.14,
  patience: 0.14,
  warmth: 0.1,
  listening: 0.1,
  fluency: 0.1,
  adaptability: 0.08,
  engagement: 0.08,
  accuracy: 0.06,
}

const KEYWORDS: Record<RubricDimension, string[]> = {
  clarity: ["first", "then", "because", "so that", "step", "important"],
  simplification: [
    "for example",
    "imagine",
    "think of it as",
    "step by step",
    "simple",
    "let's say",
  ],
  patience: [
    "that's okay",
    "no problem",
    "take your time",
    "we can",
    "let's try again",
    "it's fine",
  ],
  warmth: [
    "welcome",
    "glad",
    "happy",
    "absolutely",
    "of course",
    "great question",
  ],
  listening: [
    "you mentioned",
    "as you said",
    "what you're saying",
    "your question",
    "based on that",
  ],
  fluency: ["because", "therefore", "for example", "in other words"],
  adaptability: [
    "another way",
    "different way",
    "alternatively",
    "if not",
    "we can also",
  ],
  engagement: [
    "what do you think",
    "can you tell me",
    "how would you",
    "let's try",
    "does that make sense",
  ],
  accuracy: ["because", "therefore", "that means", "so the answer"],
}

const FILLERS = ["um", "uh", "like", "you know", "sort of", "kind of"]
const UNCERTAINTY = ["maybe", "i guess", "i'm not sure", "probably", "not sure"]

function clampScore(score: number) {
  return Math.max(1, Math.min(5, Math.round(score)))
}

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim()
}

function countWords(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
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

  if (dimension === "fluency") {
    parts.push(
      context.fillerRate > 0.08
        ? "The transcript contains enough filler language to lower fluency confidence."
        : "The transcript shows relatively steady spoken fluency with limited filler language."
    )
  }

  if (dimension === "accuracy" && context.uncertaintyCount > 0) {
    parts.push(
      "The candidate used uncertain language in explanation-heavy turns, so this dimension remains conservative."
    )
  }

  if (context.candidateTurns < 6 || context.candidateWords < 120) {
    parts.push(
      "Transcript coverage is still limited, so this score should be treated as first-pass evidence."
    )
  }

  return parts.join(" ")
}

function pickEvidence(
  segments: CandidateSegment[],
  dimension: RubricDimension
): DimensionEvidence | null {
  const scoredSegments = segments
    .map((segment) => {
      const text = normalize(segment.text)
      const keywordScore = countMatches(text, KEYWORDS[dimension])
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
    rationale: `Representative transcript evidence for ${DIMENSION_LABELS[dimension]}.`,
    startedAt: best.segment.startedAt,
    endedAt: best.segment.endedAt,
  }
}

function computeDimensionScore(
  dimension: RubricDimension,
  segments: CandidateSegment[],
  candidateTurns: number,
  candidateWords: number
) {
  const normalizedTranscript = normalize(segments.map((segment) => segment.text).join(" "))
  const avgWords = average(segments.map((segment) => countWords(segment.text)))
  const markerCount = countMatches(normalizedTranscript, KEYWORDS[dimension])
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

  if (dimension === "clarity") {
    if (avgWords >= 10 && avgWords <= 35) {
      score += 0.5
    }
    if (avgWords < 5 || avgWords > 55) {
      score -= 0.75
    }
  }

  if (dimension === "fluency") {
    if (fillerRate > 0.08) {
      score -= 1
    } else if (fillerRate < 0.03 && avgWords >= 8) {
      score += 0.5
    }
  }

  if (dimension === "accuracy") {
    if (uncertaintyCount >= 3) {
      score -= 1
    } else if (uncertaintyCount === 0 && markerCount >= 2) {
      score += 0.5
    }
  }

  if (dimension === "engagement") {
    const questionCount = segments.filter((segment) =>
      segment.text.includes("?")
    ).length

    if (questionCount >= 2) {
      score += 0.5
    }
  }

  const clampedScore = clampScore(score)

  return {
    dimension,
    score: clampedScore,
    rationale: buildDimensionRationale(dimension, clampedScore, {
      candidateTurns,
      candidateWords,
      markerCount,
      fillerRate,
      uncertaintyCount,
    }),
    evidence: pickEvidence(segments, dimension),
  }
}

function describeTranscriptQuality(candidateTurns: number, candidateWords: number) {
  if (candidateTurns < 4 || candidateWords < 80) {
    return "Transcript coverage is too limited for a confident hiring recommendation."
  }

  if (candidateTurns < 8 || candidateWords < 180) {
    return "Transcript coverage is usable but still thin, so the report should be treated as first-pass evidence."
  }

  return undefined
}

function pickTopDimensions(
  dimensionScores: DimensionScore[],
  direction: "high" | "low"
) {
  const sorted = [...dimensionScores].toSorted((left, right) =>
    direction === "high" ? right.score - left.score : left.score - right.score
  )

  return sorted
    .slice(0, 3)
    .map((item) => item.dimension.replaceAll("_", " "))
}

export function buildAssessmentReport(
  input: CandidateReviewInput
): AssessmentComputation {
  const candidateSegments = input.transcript.filter(
    (segment): segment is CandidateSegment =>
      segment.speaker === "candidate" && segment.status === "final"
  )
  const candidateTurns = candidateSegments.length
  const candidateWords = candidateSegments.reduce(
    (total, segment) => total + countWords(segment.text),
    0
  )

  const scoredDimensions = RUBRIC_DIMENSIONS.map((dimension) =>
    computeDimensionScore(dimension, candidateSegments, candidateTurns, candidateWords)
  )
  const dimensionScores: DimensionScore[] = scoredDimensions.map((item) => ({
    dimension: item.dimension,
    score: item.score,
    rationale: item.rationale,
  }))
  const evidence = scoredDimensions
    .map((item) => item.evidence)
    .filter((item): item is DimensionEvidence => Boolean(item))

  const weightedScoreRaw = dimensionScores.reduce(
    (total, item) => total + item.score * DIMENSION_WEIGHTS[item.dimension],
    0
  )
  const weightedScore = Number(weightedScoreRaw.toFixed(2))
  const transcriptQualityNote = describeTranscriptQuality(
    candidateTurns,
    candidateWords
  )

  let confidence: Confidence = "high"
  if (candidateTurns < 12 || candidateWords < 300 || evidence.length < 5) {
    confidence = "medium"
  }
  if (candidateTurns < 6 || candidateWords < 140 || evidence.length < 3) {
    confidence = "low"
  }

  const hardGateTriggered = dimensionScores.some(
    (item) =>
      (item.dimension === "clarity" && item.score <= 2) ||
      (item.dimension === "patience" && item.score <= 2) ||
      (item.dimension === "accuracy" && item.score <= 2)
  )

  let overallRecommendation: Recommendation = "mixed"
  if (hardGateTriggered) {
    overallRecommendation = "no"
  } else if (confidence === "low") {
    overallRecommendation = weightedScore >= 3.7 ? "mixed" : "no"
  } else if (weightedScore >= 4.25) {
    overallRecommendation = "strong_yes"
  } else if (weightedScore >= 3.45) {
    overallRecommendation = "yes"
  } else if (weightedScore >= 2.75) {
    overallRecommendation = "mixed"
  } else {
    overallRecommendation = "no"
  }

  const topStrengths = pickTopDimensions(dimensionScores, "high")
  const topConcerns = pickTopDimensions(dimensionScores, "low")

  const status: ReportStatus = confidence === "low" ? "manual_review" : "completed"

  const summary = [
    `${input.candidateName} completed the ${input.templateName} screening with a ${overallRecommendation.replaceAll("_", " ")} recommendation and ${confidence} confidence.`,
    hardGateTriggered
      ? "A hard gate was triggered, so this result should be treated as a likely reject unless a recruiter finds counter-evidence."
      : `The strongest visible dimensions were ${topStrengths.join(", ")}.`,
    `Primary follow-up areas are ${topConcerns.join(", ")}.`,
    transcriptQualityNote ?? "Transcript coverage was strong enough for a first-pass recommendation.",
  ].join(" ")

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
