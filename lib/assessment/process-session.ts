import { fetchMutation, fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { createDiagnosticLogger } from '@/lib/interview/diagnostics'

import {
  buildAssessmentReport,
  type AssessmentComputation,
} from './report-engine'

type SessionId = Id<'interviewSessions'>
const PROCESSING_WRITE_KEY = process.env.KYMA_PROCESSING_WRITE_KEY?.trim()

export async function markAssessmentProcessing(sessionId: SessionId) {
  const detail = await fetchQuery(api.recruiter.getSessionProcessingDetail, {
    sessionId,
  })

  if (detail?.report?.status === 'completed') {
    return
  }

  await fetchMutation(api.recruiter.saveAssessmentReport, {
    sessionId,
    processingKey: PROCESSING_WRITE_KEY,
    status: 'processing',
    summary: 'Assessment processing has been requested.',
  })
}

export async function markAssessmentFailed(
  sessionId: SessionId,
  reason: string
) {
  await fetchMutation(api.recruiter.saveAssessmentReport, {
    sessionId,
    processingKey: PROCESSING_WRITE_KEY,
    status: 'failed',
    summary: reason,
    topConcerns: ['processing failure'],
  })

  await fetchMutation(api.interviews.appendSessionEvent, {
    sessionId,
    type: 'processing-failed',
    detail: reason,
    state: 'failed',
  })
}

export async function processInterviewAssessment(
  sessionId: SessionId,
  source: 'inline' | 'inngest'
): Promise<AssessmentComputation | null> {
  const logger = createDiagnosticLogger('assessment-pipeline', {
    actor: 'server',
    sessionId,
    meta: { source },
  })

  logger.info({
    event: 'assessment.processing.started',
    detail: 'Starting structured assessment generation.',
  })

  const detail = await fetchQuery(api.recruiter.getSessionProcessingDetail, {
    sessionId,
  })

  if (!detail) {
    throw new Error('Session detail is unavailable for assessment processing.')
  }

  if (detail.report?.status === 'completed') {
    logger.info({
      event: 'assessment.processing.skip',
      detail: 'Report already completed; skipping duplicate processing.',
    })
    return null
  }

  const report = buildAssessmentReport({
    sessionId,
    candidateName: detail.candidate.name,
    templateName: detail.template.name,
    transcript: detail.transcript,
    events: detail.events,
  })

  await fetchMutation(api.recruiter.saveAssessmentReport, {
    sessionId,
    processingKey: PROCESSING_WRITE_KEY,
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
    policySnapshot: detail.policySnapshot,
  })

  await fetchMutation(api.interviews.appendSessionEvent, {
    sessionId,
    type: 'processing-completed',
    detail:
      report.status === 'manual_review'
        ? 'Assessment report generated and routed to manual review.'
        : 'Assessment report generated successfully.',
    state: 'completed',
  })

  logger.info({
    event: 'assessment.processing.completed',
    detail: 'Structured assessment generation completed.',
    meta: {
      recommendation: report.overallRecommendation,
      confidence: report.confidence,
      status: report.status,
    },
  })

  return report
}
