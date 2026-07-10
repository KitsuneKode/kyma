import { generateText } from 'ai'
import {
  buildRecruiterChatUserPrompt,
  RECRUITER_CHAT_SYSTEM_PROMPT,
} from '@/lib/recruiter/report-chat-prompts'

export type RecruiterCitation = {
  kind: 'evidence' | 'transcript' | 'dimension'
  ref: string
  label: string
}

export type RecruiterAnswer = {
  text: string
  source: 'fallback' | 'model'
  citations: RecruiterCitation[]
  modelId?: string
  degradedReason?: string
}

export type RecruiterQuestionClass =
  | 'strengths'
  | 'risks'
  | 'recommendation'
  | 'missing_evidence'
  | 'follow_ups'
  | 'out_of_scope'
  | 'general'

const GROUNDING_VERSION = 'v1'

type DetailShape = {
  candidate: { name: string }
  template: { name: string }
  report: {
    summary?: string | null
    recommendation?: string | null
    confidence?: string | null
    topStrengths: string[]
    topConcerns: string[]
    dimensionScores: Array<{
      dimension: string
      score: number
      rationale: string
    }>
  } | null
  transcript: Array<{
    speaker: 'agent' | 'candidate' | 'system'
    text: string
    startedAt: string
  }>
  evidence: Array<{
    dimension: string
    snippet: string
    rationale: string
  }>
}

function buildContext(detail: DetailShape) {
  const evidence = detail.evidence
    .slice(0, 8)
    .map(
      (entry, index) =>
        `[evidence:${index}:${entry.dimension}] ${entry.dimension}: "${entry.snippet}" (${entry.rationale})`
    )
    .join('\n')
  const dimensions =
    detail.report?.dimensionScores
      .map(
        (entry) => `${entry.dimension}: ${entry.score}/5 - ${entry.rationale}`
      )
      .join('\n') ?? 'No dimension scores are available yet.'
  const transcript =
    detail.transcript
      .slice(-14)
      .map(
        (entry) =>
          `[transcript:${entry.startedAt}] ${entry.speaker}: ${entry.text}`
      )
      .join('\n') || 'No transcript available.'

  return `
Candidate: ${detail.candidate.name}
Assessment template: ${detail.template.name}
Recommendation: ${detail.report?.recommendation ?? 'pending'}
Confidence: ${detail.report?.confidence ?? 'pending'}
Summary: ${detail.report?.summary ?? 'No summary available yet.'}
Top strengths: ${detail.report?.topStrengths.join(', ') || 'None'}
Top concerns: ${detail.report?.topConcerns.join(', ') || 'None'}

Dimension scores:
${dimensions}

Evidence:
${evidence || 'No evidence available.'}

Recent transcript:
${transcript}
`.trim()
}

function citationsFromDetail(detail: DetailShape): RecruiterCitation[] {
  const out: RecruiterCitation[] = []
  for (const [index, entry] of detail.evidence.slice(0, 5).entries()) {
    out.push({
      kind: 'evidence',
      ref: `evidence:${index}:${entry.dimension}`,
      label: `${entry.dimension}: ${entry.snippet.slice(0, 80)}${entry.snippet.length > 80 ? '…' : ''}`,
    })
  }
  const last = detail.transcript.at(-1)
  if (last) {
    out.push({
      kind: 'transcript',
      ref: `transcript:${last.startedAt}`,
      label: `${last.speaker}: ${last.text.slice(0, 80)}${last.text.length > 80 ? '…' : ''}`,
    })
  }
  return out
}

function citationKindFromRef(ref: string): RecruiterCitation['kind'] {
  if (ref.startsWith('transcript:')) return 'transcript'
  if (ref.startsWith('evidence:')) return 'evidence'
  return 'dimension'
}

export function classifyRecruiterQuestion(
  question: string
): RecruiterQuestionClass {
  const q = question.toLowerCase().trim()

  if (
    /salary|compensation|ssn|social security|password|jailbreak|ignore (previous|all) instructions|write (me )?(a |some )?code|other candidate|personal (email|phone|address)/.test(
      q
    )
  ) {
    return 'out_of_scope'
  }

  if (
    /missing|insufficient|thin|gap|lack\w* evidence|what.*(don'?t|do not|we not).*know|not enough evidence/.test(
      q
    )
  ) {
    return 'missing_evidence'
  }

  if (
    /follow[- ]?up|next question|ask (them|the candidate)|what should (i|we) ask|probe|clarif(y|ying)/.test(
      q
    )
  ) {
    return 'follow_ups'
  }

  if (/strength|strong|good at|what.*(do|did).*well|positive signal/.test(q)) {
    return 'strengths'
  }

  if (/concern|risk|weak|red flag|worry|negative signal|issue with/.test(q)) {
    return 'risks'
  }

  if (
    /recommend|advance|reject|hire|decision|should (we|i) (move|advance|reject|hire)/.test(
      q
    )
  ) {
    return 'recommendation'
  }

  if (
    /summary|overall|tell me about|how did|walk me through|general (take|view)/.test(
      q
    )
  ) {
    return 'general'
  }

  return 'out_of_scope'
}

function refuseOutOfScope(detail: DetailShape): RecruiterAnswer {
  return {
    text: `I can only answer from this session’s report, evidence, and transcript for ${detail.candidate.name}. Ask about strengths, risks, the recommendation, missing evidence, or suggested follow-up questions.`,
    source: 'fallback',
    citations: [],
  }
}

function missingEvidenceAnswer(detail: DetailShape): RecruiterAnswer {
  const citations = citationsFromDetail(detail)
  const lowDimensions =
    detail.report?.dimensionScores
      .filter((entry) => entry.score <= 2)
      .map((entry) => entry.dimension) ?? []
  const evidenceCount = detail.evidence.length
  const confidence = detail.report?.confidence ?? 'pending'

  if (evidenceCount === 0) {
    return {
      text: `There is no structured evidence stored for this session yet. Treat any automated recommendation (${detail.report?.recommendation ?? 'pending'}, confidence ${confidence}) as provisional until transcript review is complete.`,
      source: 'fallback',
      citations: [],
    }
  }

  const thinParts = [
    lowDimensions.length
      ? `Low-scoring dimensions with limited support: ${lowDimensions.join(', ')}.`
      : null,
    `Only ${evidenceCount} evidence snippet${evidenceCount === 1 ? '' : 's'} ${evidenceCount === 1 ? 'is' : 'are'} available, and confidence is ${confidence}.`,
    'Prefer manual review of the transcript before relying on gaps the model did not cover.',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    text: thinParts,
    source: 'fallback',
    citations,
  }
}

function followUpsAnswer(detail: DetailShape): RecruiterAnswer {
  const citations = citationsFromDetail(detail)
  const concerns = detail.report?.topConcerns ?? []
  const lowDimensions =
    detail.report?.dimensionScores
      .filter((entry) => entry.score <= 3)
      .map((entry) => entry.dimension) ?? []

  const topics = [...new Set([...concerns, ...lowDimensions])].slice(0, 3)
  if (!topics.length) {
    return {
      text: `Suggested follow-ups: ask ${detail.candidate.name} to walk through a concrete example from the interview, clarify decision tradeoffs, and explain how they would handle a weaker student or edge case. Ground any live follow-up in the transcript before treating it as scored evidence.`,
      source: 'fallback',
      citations,
    }
  }

  const questions = topics.map(
    (topic) =>
      `Ask for a specific example that demonstrates ${topic}, including what they would do differently next time.`
  )

  return {
    text: `Suggested follow-up questions based on current concerns/scores:\n- ${questions.join('\n- ')}`,
    source: 'fallback',
    citations,
  }
}

function generalAnswer(detail: DetailShape): RecruiterAnswer {
  const citations = citationsFromDetail(detail)
  const summary = detail.report?.summary
  if (!summary && !detail.report) {
    return {
      text: `No scored report is available yet for ${detail.candidate.name}. Review the transcript directly, then ask a more specific question about strengths, risks, or recommendation once scoring finishes.`,
      source: 'fallback',
      citations: citations.length ? citations : [],
    }
  }

  return {
    text: `${detail.candidate.name}: ${summary ?? 'No summary available yet.'} Current recommendation is ${detail.report?.recommendation ?? 'pending'} with ${detail.report?.confidence ?? 'pending'} confidence. Strengths: ${detail.report?.topStrengths.join(', ') || 'none listed'}. Concerns: ${detail.report?.topConcerns.join(', ') || 'none listed'}.`,
    source: 'fallback',
    citations,
  }
}

function fallbackAnswer(
  question: string,
  detail: DetailShape
): RecruiterAnswer {
  const questionClass = classifyRecruiterQuestion(question)
  const citations = citationsFromDetail(detail)

  switch (questionClass) {
    case 'strengths':
      return {
        text: `The strongest reported areas for ${detail.candidate.name} are ${detail.report?.topStrengths.join(', ') || 'not available yet'}. Review the evidence cards to verify whether those strengths are well-supported.`,
        source: 'fallback',
        citations,
      }
    case 'risks':
      return {
        text: `The main concerns currently flagged are ${detail.report?.topConcerns.join(', ') || 'not available yet'}. If this is a borderline case, treat it as a manual-review candidate instead of trusting the automated score alone.`,
        source: 'fallback',
        citations,
      }
    case 'recommendation':
      return {
        text: `${detail.candidate.name} currently has a ${detail.report?.recommendation ?? 'pending'} recommendation with ${detail.report?.confidence ?? 'pending'} confidence. Use the evidence cards and transcript to confirm whether the recruiter decision should follow that recommendation.`,
        source: 'fallback',
        citations,
      }
    case 'missing_evidence':
      return missingEvidenceAnswer(detail)
    case 'follow_ups':
      return followUpsAnswer(detail)
    case 'general':
      return generalAnswer(detail)
    case 'out_of_scope':
    default:
      return refuseOutOfScope(detail)
  }
}

export async function answerRecruiterQuestion(
  question: string,
  detail: DetailShape,
  options?: {
    modelId?: string | undefined
    providerOptions?: Parameters<typeof generateText>[0]['providerOptions']
    degradedReason?: string
  }
): Promise<RecruiterAnswer> {
  const configuredModel = options?.modelId?.trim() || undefined

  if (!configuredModel) {
    return {
      ...fallbackAnswer(question, detail),
      degradedReason:
        options?.degradedReason ??
        'No explicit review-chat model configured with available credentials.',
    }
  }

  const questionClass = classifyRecruiterQuestion(question)
  if (questionClass === 'out_of_scope') {
    return refuseOutOfScope(detail)
  }

  try {
    const { text } = await generateText({
      model: configuredModel,
      providerOptions: options?.providerOptions,
      system: RECRUITER_CHAT_SYSTEM_PROMPT,
      prompt: buildRecruiterChatUserPrompt({
        context: buildContext(detail),
        question,
      }),
    })

    const citations = parseCitationLine(text, detail)

    return {
      text: stripCitationLine(text),
      source: 'model',
      citations,
      modelId: configuredModel,
    }
  } catch {
    return {
      ...fallbackAnswer(question, detail),
      degradedReason: 'Model request failed; using deterministic fallback.',
    }
  }
}

export function stripCitationLine(text: string) {
  const marker = '\nCITATIONS:'
  const index = text.indexOf(marker)
  if (index === -1) {
    return text.trim()
  }
  return text.slice(0, index).trim()
}

function parseCitationLine(
  text: string,
  detail: DetailShape
): RecruiterCitation[] {
  const marker = 'CITATIONS:'
  const line = text.split('\n').find((l) => l.includes(marker))
  if (!line) {
    return citationsFromDetail(detail).slice(0, 3)
  }
  const raw = line.slice(line.indexOf(marker) + marker.length).trim()
  if (!raw) {
    return citationsFromDetail(detail).slice(0, 3)
  }
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((ref) => ({
      kind: citationKindFromRef(ref),
      ref,
      label: ref,
    }))
}

export { GROUNDING_VERSION }
