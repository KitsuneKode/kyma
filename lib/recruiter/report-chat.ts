import { generateText } from "ai"

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
    speaker: "agent" | "candidate" | "system"
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
  const transcript = detail.transcript
    .slice(-14)
    .map((entry) => `${entry.speaker}: ${entry.text}`)
    .join("\n")
  const evidence = detail.evidence
    .slice(0, 8)
    .map(
      (entry) => `${entry.dimension}: "${entry.snippet}" (${entry.rationale})`
    )
    .join("\n")
  const dimensions =
    detail.report?.dimensionScores
      .map(
        (entry) =>
          `${entry.dimension}: ${entry.score}/5 - ${entry.rationale}`
      )
      .join("\n") ?? "No dimension scores are available yet."

  return `
Candidate: ${detail.candidate.name}
Assessment template: ${detail.template.name}
Recommendation: ${detail.report?.recommendation ?? "pending"}
Confidence: ${detail.report?.confidence ?? "pending"}
Summary: ${detail.report?.summary ?? "No summary available yet."}
Top strengths: ${detail.report?.topStrengths.join(", ") || "None"}
Top concerns: ${detail.report?.topConcerns.join(", ") || "None"}

Dimension scores:
${dimensions}

Evidence:
${evidence || "No evidence available."}

Recent transcript:
${transcript || "No transcript available."}
`.trim()
}

function fallbackAnswer(question: string, detail: DetailShape) {
  const normalizedQuestion = question.toLowerCase()

  if (normalizedQuestion.includes("strength")) {
    return `The strongest reported areas for ${detail.candidate.name} are ${detail.report?.topStrengths.join(", ") || "not available yet"}. Review the evidence cards to verify whether those strengths are well-supported.`
  }

  if (
    normalizedQuestion.includes("concern") ||
    normalizedQuestion.includes("risk")
  ) {
    return `The main concerns currently flagged are ${detail.report?.topConcerns.join(", ") || "not available yet"}. If this is a borderline case, treat it as a manual-review candidate instead of trusting the automated score alone.`
  }

  if (
    normalizedQuestion.includes("recommend") ||
    normalizedQuestion.includes("advance") ||
    normalizedQuestion.includes("reject")
  ) {
    return `${detail.candidate.name} currently has a ${detail.report?.recommendation ?? "pending"} recommendation with ${detail.report?.confidence ?? "pending"} confidence. Use the evidence cards and transcript to confirm whether the recruiter decision should follow that recommendation.`
  }

  const firstEvidence = detail.evidence[0]

  if (firstEvidence) {
    return `The report points first to ${firstEvidence.dimension} as a meaningful signal. Evidence example: "${firstEvidence.snippet}". Rationale: ${firstEvidence.rationale}`
  }

  return `There is not enough structured evidence yet to answer that reliably. Use the transcript and report summary first, then ask a more specific question about strengths, concerns, or recommendation.`
}

export async function answerRecruiterQuestion(
  question: string,
  detail: DetailShape
) {
  const configuredModel = process.env.KYMA_REVIEW_CHAT_MODEL

  if (!configuredModel) {
    return fallbackAnswer(question, detail)
  }

  try {
    const { text } = await generateText({
      model: configuredModel,
      system:
        "You are a grounded recruiter copilot. Answer only from the provided interview report, evidence, and transcript. If the evidence is thin, say so plainly. Do not invent details.",
      prompt: `Answer the recruiter question using only the context below.\n\n${buildContext(
        detail
      )}\n\nQuestion: ${question}`,
    })

    return text
  } catch {
    return fallbackAnswer(question, detail)
  }
}
