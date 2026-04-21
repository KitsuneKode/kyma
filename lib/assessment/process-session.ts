import { fetchMutation, fetchQuery } from "convex/nextjs"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { createDiagnosticLogger } from "@/lib/interview/diagnostics"

import { buildAssessmentReport } from "./report-engine"

type SessionId = Id<"interviewSessions">

export async function markAssessmentProcessing(sessionId: SessionId) {
  await fetchMutation(api.recruiter.saveAssessmentReport, {
    sessionId,
    status: "processing",
    summary: "Assessment processing has been requested.",
  })
}

export async function markAssessmentFailed(
  sessionId: SessionId,
  reason: string
) {
  await fetchMutation(api.recruiter.saveAssessmentReport, {
    sessionId,
    status: "failed",
    summary: reason,
    topConcerns: ["processing failure"],
  })

  await fetchMutation(api.interviews.appendSessionEvent, {
    sessionId,
    type: "processing-failed",
    detail: reason,
    state: "failed",
  })
}

export async function processInterviewAssessment(
  sessionId: SessionId,
  source: "inline" | "inngest"
) {
  const logger = createDiagnosticLogger("assessment-pipeline", {
    actor: "server",
    sessionId,
    meta: { source },
  })

  logger.info({
    event: "assessment.processing.started",
    detail: "Starting structured assessment generation.",
  })

  const detail = await fetchQuery(api.recruiter.getSessionProcessingDetail, {
    sessionId,
  })

  if (!detail) {
    throw new Error("Session detail is unavailable for assessment processing.")
  }

  const report = buildAssessmentReport({
    sessionId,
    candidateName: detail.candidate.name,
    templateName: detail.template.name,
    transcript: detail.transcript,
  })

  await fetchMutation(api.recruiter.saveAssessmentReport, {
    sessionId,
    status: report.status,
    overallRecommendation: report.overallRecommendation,
    confidence: report.confidence,
    summary: report.summary,
    weightedScore: report.weightedScore,
    hardGateTriggered: report.hardGateTriggered,
    topStrengths: report.topStrengths,
    topConcerns: report.topConcerns,
    transcriptQualityNote: report.transcriptQualityNote,
    dimensionScores: report.dimensionScores,
    evidence: report.evidence,
  })

  await fetchMutation(api.interviews.appendSessionEvent, {
    sessionId,
    type: "processing-completed",
    detail:
      report.status === "manual_review"
        ? "Assessment report generated and routed to manual review."
        : "Assessment report generated successfully.",
    state: "completed",
  })

  logger.info({
    event: "assessment.processing.completed",
    detail: "Structured assessment generation completed.",
    meta: {
      recommendation: report.overallRecommendation,
      confidence: report.confidence,
      status: report.status,
    },
  })

  return report
}
