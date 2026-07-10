import { fetchMutation, fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { createDiagnosticLogger } from '@/lib/interview/diagnostics'
import { serverEnv } from '@/lib/env/server'
import {
  buildGatewayByokOptions,
  resolveScoringModelId,
} from '@/lib/providers/resolve-model'

import { buildHybridAssessmentReport } from './llm-report'
import {
  buildAssessmentReport,
  type AssessmentComputation,
} from './report-engine'
import type { RubricConfig } from './llm-report-schema'

type SessionId = Id<'interviewSessions'>
const PROCESSING_WRITE_KEY = serverEnv.KYMA_PROCESSING_WRITE_KEY?.trim()

export async function markAssessmentProcessing(sessionId: SessionId) {
  const detail = await fetchQuery(
    api.processing.assessment.getSessionProcessingDetail,
    {
      sessionId,
      processingKey: PROCESSING_WRITE_KEY,
    }
  )

  const reportStatus = detail?.report?.status
  // Idempotent: do not overwrite completed or in-flight reports.
  if (
    reportStatus === 'completed' ||
    reportStatus === 'manual_review' ||
    reportStatus === 'processing'
  ) {
    return
  }

  await fetchMutation(api.processing.assessment.saveAssessmentReport, {
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
  await fetchMutation(api.processing.assessment.saveAssessmentReport, {
    sessionId,
    processingKey: PROCESSING_WRITE_KEY,
    status: 'failed',
    summary: reason,
    topConcerns: ['processing failure'],
  })

  await fetchMutation(api.interviews.sessionEvents.appendSessionEvent, {
    processingKey: PROCESSING_WRITE_KEY,
    sessionId,
    type: 'processing-failed',
    detail: reason,
    source: 'assessment-pipeline',
    dedupeKey: `processing-failed:${sessionId}`,
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

  const detail = await fetchQuery(
    api.processing.assessment.getSessionProcessingDetail,
    {
      sessionId,
      processingKey: PROCESSING_WRITE_KEY,
    }
  )

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

  const reviewInput = {
    sessionId: `${sessionId}`,
    candidateName: detail.candidate.name,
    templateName: detail.template.name,
    transcript: detail.transcript,
    events: detail.events,
  }

  const scoringModelId = resolveScoringModelId(
    detail.workspace?.defaultModels,
    detail.template.modelOverrides,
    {
      scoring: serverEnv.KYMA_SCORING_MODEL,
      reviewChat: serverEnv.KYMA_REVIEW_CHAT_MODEL,
    }
  )
  const providerOptions = buildGatewayByokOptions({
    modelId: scoringModelId,
    providerKeys: detail.workspace?.providerKeys,
    encryptionKey: serverEnv.KYMA_ENCRYPTION_KEY,
  })

  let report: AssessmentComputation
  let scoringSource: 'llm' | 'deterministic' = 'deterministic'

  try {
    const hybrid = await buildHybridAssessmentReport({
      input: reviewInput,
      rubricConfig: detail.template.rubricConfig as RubricConfig | undefined,
      modelId: scoringModelId,
      providerOptions,
    })

    report = hybrid.report
    scoringSource = hybrid.source

    if (hybrid.crossCheck?.hasDisagreement) {
      logger.warn({
        event: 'assessment.cross_check.disagreement',
        detail: hybrid.crossCheck.reasons.join(' '),
      })
    }

    if (hybrid.evidenceValidation && !hybrid.evidenceValidation.valid) {
      logger.warn({
        event: 'assessment.evidence.invalid',
        detail: `${hybrid.evidenceValidation.invalidQuotes.length} evidence quote(s) failed grounding validation.`,
      })
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'LLM scoring failed unexpectedly.'

    logger.warn({
      event: 'assessment.llm.failed',
      detail: message,
    })

    const deterministic = buildAssessmentReport(reviewInput)
    report = {
      ...deterministic,
      status:
        deterministic.status === 'completed'
          ? 'manual_review'
          : deterministic.status,
      summary: `${deterministic.summary} LLM scoring was unavailable (${message}); deterministic cross-check used instead.`,
    }
    scoringSource = 'deterministic'
  }

  await fetchMutation(api.processing.assessment.saveAssessmentReport, {
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
    scoringSource,
    scoringModelId,
    policySnapshot: detail.policySnapshot,
  })

  await fetchMutation(api.interviews.sessionEvents.appendSessionEvent, {
    processingKey: PROCESSING_WRITE_KEY,
    sessionId,
    type: 'processing-completed',
    detail:
      report.status === 'manual_review'
        ? 'Assessment report generated and routed to manual review.'
        : 'Assessment report generated successfully.',
    source: 'assessment-pipeline',
    dedupeKey: `processing-completed:${sessionId}`,
    state: 'completed',
  })

  logger.info({
    event: 'assessment.processing.completed',
    detail: 'Structured assessment generation completed.',
    meta: {
      recommendation: report.overallRecommendation,
      confidence: report.confidence,
      status: report.status,
      scoringSource,
      scoringModelId,
    },
  })

  return report
}
