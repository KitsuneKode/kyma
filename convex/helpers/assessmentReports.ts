import { v, type Infer } from 'convex/values'

import type { MutationCtx } from '../_generated/server'
import { rateLimiter } from '../rateLimiter'
import {
  confidenceValidator,
  interviewPolicySnapshotValidator,
  recommendationValidator,
  reportStatusValidator,
  scoringDimensionValidator,
} from '../validators'

export const saveAssessmentReportFields = {
  sessionId: v.id('interviewSessions'),
  status: reportStatusValidator,
  overallRecommendation: v.optional(recommendationValidator),
  confidence: v.optional(confidenceValidator),
  summary: v.optional(v.string()),
  weightedScore: v.optional(v.number()),
  hardGateTriggered: v.optional(v.boolean()),
  hardGateDimensions: v.optional(v.array(v.string())),
  topStrengths: v.optional(v.array(v.string())),
  topConcerns: v.optional(v.array(v.string())),
  transcriptQualityNote: v.optional(v.string()),
  scoringSource: v.optional(
    v.union(v.literal('llm'), v.literal('deterministic'))
  ),
  scoringModelId: v.optional(v.string()),
  dimensionScores: v.optional(
    v.array(
      v.object({
        dimension: scoringDimensionValidator,
        score: v.number(),
        rationale: v.string(),
      })
    )
  ),
  evidence: v.optional(
    v.array(
      v.object({
        dimension: scoringDimensionValidator,
        snippet: v.string(),
        rationale: v.string(),
        startedAt: v.optional(v.string()),
        endedAt: v.optional(v.string()),
      })
    )
  ),
  policySnapshot: v.optional(interviewPolicySnapshotValidator),
}

export const saveAssessmentReportArgsValidator = v.object(
  saveAssessmentReportFields
)

type SaveAssessmentReportInput = Infer<typeof saveAssessmentReportArgsValidator>

export async function persistAssessmentReport(
  ctx: MutationCtx,
  orgId: string,
  args: SaveAssessmentReportInput,
  options: { rateLimit: boolean }
) {
  if (options.rateLimit) {
    await rateLimiter.limit(ctx, 'reportGeneration', {
      key: `${args.sessionId}`,
      throws: true,
    })
  }

  const now = new Date().toISOString()
  const existingReport = await ctx.db
    .query('assessmentReports')
    .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
    .first()

  // A report that already reached a terminal status must never be downgraded to
  // `failed` by a straggler from an earlier, slower run - that would replace a
  // real result (or a human-routed review) with a processing error.
  const TERMINAL_REPORT_STATUSES = new Set(['completed', 'manual_review'])
  if (
    existingReport &&
    args.status === 'failed' &&
    TERMINAL_REPORT_STATUSES.has(existingReport.status)
  ) {
    return existingReport._id
  }

  const reportFields = {
    orgId,
    sessionId: args.sessionId,
    status: args.status,
    overallRecommendation: args.overallRecommendation,
    confidence: args.confidence,
    summary: args.summary,
    weightedScore: args.weightedScore,
    hardGateTriggered: args.hardGateTriggered,
    hardGateDimensions: args.hardGateDimensions,
    topStrengths: args.topStrengths,
    topConcerns: args.topConcerns,
    transcriptQualityNote: args.transcriptQualityNote,
    dimensionScores: args.dimensionScores,
    scoringSource: args.scoringSource,
    scoringModelId: args.scoringModelId,
    generatedAt: now,
    ...(args.policySnapshot ? { policySnapshot: args.policySnapshot } : {}),
  }

  const reportId = existingReport
    ? (await ctx.db.patch(existingReport._id, reportFields), existingReport._id)
    : await ctx.db.insert('assessmentReports', reportFields)

  if (args.evidence) {
    const existingEvidence = await ctx.db
      .query('dimensionEvidence')
      .withIndex('by_report', (q) => q.eq('reportId', reportId))
      .take(500)

    await Promise.all(existingEvidence.map((item) => ctx.db.delete(item._id)))

    await Promise.all(
      args.evidence.map((item) =>
        ctx.db.insert('dimensionEvidence', {
          orgId,
          reportId,
          sessionId: args.sessionId,
          dimension: item.dimension,
          snippet: item.snippet,
          rationale: item.rationale,
          startedAt: item.startedAt,
          endedAt: item.endedAt,
          createdAt: now,
        })
      )
    )
  }

  return reportId
}
