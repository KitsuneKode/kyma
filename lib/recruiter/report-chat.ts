import { generateText } from "ai";

export type RecruiterCitation = {
  kind: "evidence" | "transcript" | "dimension";
  ref: string;
  label: string;
};

export type RecruiterAnswer = {
  text: string;
  source: "fallback" | "model";
  citations: RecruiterCitation[];
  modelId?: string;
};

const GROUNDING_VERSION = "v1";

type DetailShape = {
  candidate: { name: string };
  template: { name: string };
  report: {
    summary?: string | null;
    recommendation?: string | null;
    confidence?: string | null;
    topStrengths: string[];
    topConcerns: string[];
    dimensionScores: Array<{
      dimension: string;
      score: number;
      rationale: string;
    }>;
  } | null;
  transcript: Array<{
    speaker: "agent" | "candidate" | "system";
    text: string;
    startedAt: string;
  }>;
  evidence: Array<{
    dimension: string;
    snippet: string;
    rationale: string;
  }>;
};

function buildContext(detail: DetailShape) {
  const transcript = detail.transcript
    .slice(-14)
    .map((entry) => `${entry.speaker}: ${entry.text}`)
    .join("\n");
  const evidence = detail.evidence
    .slice(0, 8)
    .map((entry) => `${entry.dimension}: "${entry.snippet}" (${entry.rationale})`)
    .join("\n");
  const dimensions =
    detail.report?.dimensionScores
      .map((entry) => `${entry.dimension}: ${entry.score}/5 - ${entry.rationale}`)
      .join("\n") ?? "No dimension scores are available yet.";

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
`.trim();
}

function citationsFromDetail(detail: DetailShape): RecruiterCitation[] {
  const out: RecruiterCitation[] = [];
  for (const [index, entry] of detail.evidence.slice(0, 5).entries()) {
    out.push({
      kind: "evidence",
      ref: `evidence:${index}:${entry.dimension}`,
      label: `${entry.dimension}: ${entry.snippet.slice(0, 80)}${entry.snippet.length > 80 ? "…" : ""}`,
    });
  }
  const last = detail.transcript.at(-1);
  if (last) {
    out.push({
      kind: "transcript",
      ref: `transcript:${last.startedAt}`,
      label: `${last.speaker}: ${last.text.slice(0, 80)}${last.text.length > 80 ? "…" : ""}`,
    });
  }
  return out;
}

function fallbackAnswer(question: string, detail: DetailShape): RecruiterAnswer {
  const normalizedQuestion = question.toLowerCase();
  const citations = citationsFromDetail(detail);

  if (normalizedQuestion.includes("strength")) {
    return {
      text: `The strongest reported areas for ${detail.candidate.name} are ${detail.report?.topStrengths.join(", ") || "not available yet"}. Review the evidence cards to verify whether those strengths are well-supported.`,
      source: "fallback",
      citations,
    };
  }

  if (normalizedQuestion.includes("concern") || normalizedQuestion.includes("risk")) {
    return {
      text: `The main concerns currently flagged are ${detail.report?.topConcerns.join(", ") || "not available yet"}. If this is a borderline case, treat it as a manual-review candidate instead of trusting the automated score alone.`,
      source: "fallback",
      citations,
    };
  }

  if (
    normalizedQuestion.includes("recommend") ||
    normalizedQuestion.includes("advance") ||
    normalizedQuestion.includes("reject")
  ) {
    return {
      text: `${detail.candidate.name} currently has a ${detail.report?.recommendation ?? "pending"} recommendation with ${detail.report?.confidence ?? "pending"} confidence. Use the evidence cards and transcript to confirm whether the recruiter decision should follow that recommendation.`,
      source: "fallback",
      citations,
    };
  }

  const firstEvidence = detail.evidence[0];

  if (firstEvidence) {
    return {
      text: `The report points first to ${firstEvidence.dimension} as a meaningful signal. Evidence example: "${firstEvidence.snippet}". Rationale: ${firstEvidence.rationale}`,
      source: "fallback",
      citations,
    };
  }

  return {
    text: `There is not enough structured evidence yet to answer that reliably. Use the transcript and report summary first, then ask a more specific question about strengths, concerns, or recommendation.`,
    source: "fallback",
    citations: [],
  };
}

export async function answerRecruiterQuestion(
  question: string,
  detail: DetailShape,
): Promise<RecruiterAnswer> {
  const configuredModel = process.env.KYMA_REVIEW_CHAT_MODEL;

  if (!configuredModel) {
    return fallbackAnswer(question, detail);
  }

  try {
    const { text } = await generateText({
      model: configuredModel,
      system:
        "You are a grounded recruiter copilot. Answer only from the provided interview report, evidence, and transcript. If the evidence is thin, say so plainly. Do not invent details. After your answer, add a line CITATIONS: followed by comma-separated refs like evidence:0:clarity or transcript:ISO timestamp for each claim you rely on most.",
      prompt: `Answer the recruiter question using only the context below.\n\n${buildContext(
        detail,
      )}\n\nQuestion: ${question}`,
    });

    const citations = parseCitationLine(text, detail);

    return {
      text: stripCitationLine(text),
      source: "model",
      citations,
      modelId: configuredModel,
    };
  } catch {
    return fallbackAnswer(question, detail);
  }
}

export function stripCitationLine(text: string) {
  const marker = "\nCITATIONS:";
  const index = text.indexOf(marker);
  if (index === -1) {
    return text.trim();
  }
  return text.slice(0, index).trim();
}

function parseCitationLine(text: string, detail: DetailShape): RecruiterCitation[] {
  const marker = "CITATIONS:";
  const line = text.split("\n").find((l) => l.includes(marker));
  if (!line) {
    return citationsFromDetail(detail).slice(0, 3);
  }
  const raw = line.slice(line.indexOf(marker) + marker.length).trim();
  if (!raw) {
    return citationsFromDetail(detail).slice(0, 3);
  }
  return raw.split(",").map((part) => ({
    kind: "evidence" as const,
    ref: part.trim(),
    label: part.trim(),
  }));
}

export { GROUNDING_VERSION };
