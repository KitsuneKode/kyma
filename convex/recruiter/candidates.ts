import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'

import type { Doc } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'
import { candidateReadQuery } from '../lib/customFunctions'
import {
  getLatestReviewDecision,
  resolveTemplateName,
} from '../helpers/sessionReview'
import type {
  CandidateRecommendationFilter,
  CandidateStatusFilter,
} from '../../lib/recruiter/candidate-queue-filters'
import {
  candidateRecommendationFilterValidator,
  candidateStatusFilterValidator,
} from '../validators'

const INVITE_SEARCH_SAMPLE = 500
const QUEUE_STATS_SESSION_SAMPLE = 1000
const QUEUE_STATS_REPORT_SAMPLE = 1000
const FILTERED_PAGE_SCAN_MULTIPLIER = 4
const MAX_FILTERED_PAGE_SCANS = 8

type ReviewCandidateProjection = Awaited<
  ReturnType<typeof projectReviewCandidate>
>

function matchesReviewCandidateFilters(
  candidate: ReviewCandidateProjection,
  statusFilter: CandidateStatusFilter,
  recommendationFilter: CandidateRecommendationFilter
) {
  if (statusFilter !== 'all' && candidate.reportStatus !== statusFilter) {
    return false
  }
  if (
    recommendationFilter !== 'all' &&
    candidate.recommendation !== recommendationFilter
  ) {
    return false
  }
  return true
}

export const searchCandidates = candidateReadQuery({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const normalized = args.query.trim().toLowerCase()
    const invites = await ctx.db
      .query('candidateInvites')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .take(INVITE_SEARCH_SAMPLE)
    return invites
      .filter((invite) => {
        if (!normalized) return true
        return (
          invite.candidateName?.toLowerCase().includes(normalized) ||
          invite.candidateEmail?.toLowerCase().includes(normalized) ||
          invite.inviteToken.toLowerCase().includes(normalized)
        )
      })
      .slice(0, 20)
      .map((invite) => ({
        inviteId: invite._id,
        inviteToken: invite.inviteToken,
        candidateName: invite.candidateName,
        candidateEmail: invite.candidateEmail,
      }))
  },
})

async function projectReviewCandidate(
  ctx: QueryCtx,
  session: Doc<'interviewSessions'>
) {
  const [invite, report, latestDecision] = await Promise.all([
    ctx.db.get(session.inviteId),
    ctx.db
      .query('assessmentReports')
      .withIndex('by_session', (q) => q.eq('sessionId', session._id))
      .first(),
    getLatestReviewDecision(ctx, session._id),
  ])

  const template = invite?.templateId
    ? await ctx.db.get(invite.templateId)
    : null

  return {
    sessionId: session._id,
    inviteToken: invite?.inviteToken,
    candidateName: invite?.candidateName ?? 'Candidate',
    candidateEmail: invite?.candidateEmail,
    templateName: resolveTemplateName(template?.name),
    inviteStatus: invite?.status ?? 'created',
    sessionState: session.state,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    reportStatus: report?.status ?? 'pending',
    recommendation: report?.overallRecommendation,
    confidence: report?.confidence,
    weightedScore: report?.weightedScore,
    hardGateTriggered: report?.hardGateTriggered ?? false,
    topStrengths: report?.topStrengths ?? [],
    topConcerns: report?.topConcerns ?? [],
    latestDecision: latestDecision?.decision,
    latestDecisionAt: latestDecision?.createdAt,
  }
}

export const listReviewCandidates = candidateReadQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    statusFilter: v.optional(candidateStatusFilterValidator),
    recommendationFilter: v.optional(candidateRecommendationFilterValidator),
  },
  handler: async (ctx, args) => {
    const { orgId } = ctx
    const statusFilter = args.statusFilter ?? 'all'
    const recommendationFilter = args.recommendationFilter ?? 'all'
    const filtersActive =
      statusFilter !== 'all' || recommendationFilter !== 'all'

    if (!filtersActive) {
      const result = await ctx.db
        .query('interviewSessions')
        .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
        .order('desc')
        .paginate(args.paginationOpts)

      const page = await Promise.all(
        result.page.map((session) => projectReviewCandidate(ctx, session))
      )

      return { ...result, page }
    }

    const filteredPage: ReviewCandidateProjection[] = []
    let cursor = args.paginationOpts.cursor
    let continueCursor = args.paginationOpts.cursor ?? ''
    let isDone = false
    let scans = 0

    while (
      filteredPage.length < args.paginationOpts.numItems &&
      !isDone &&
      scans < MAX_FILTERED_PAGE_SCANS
    ) {
      scans += 1
      const scanSize = Math.max(
        args.paginationOpts.numItems,
        args.paginationOpts.numItems * FILTERED_PAGE_SCAN_MULTIPLIER
      )
      const result = await ctx.db
        .query('interviewSessions')
        .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
        .order('desc')
        .paginate({ numItems: scanSize, cursor })

      const projected = await Promise.all(
        result.page.map((session) => projectReviewCandidate(ctx, session))
      )

      for (const candidate of projected) {
        if (
          matchesReviewCandidateFilters(
            candidate,
            statusFilter,
            recommendationFilter
          )
        ) {
          filteredPage.push(candidate)
          if (filteredPage.length >= args.paginationOpts.numItems) {
            break
          }
        }
      }

      isDone = result.isDone
      continueCursor = result.continueCursor
      cursor = result.continueCursor

      if (result.page.length === 0) {
        break
      }
    }

    return {
      page: filteredPage.slice(0, args.paginationOpts.numItems),
      isDone: isDone && filteredPage.length < args.paginationOpts.numItems,
      continueCursor: continueCursor ?? '',
    }
  },
})

export const getCandidateQueueStats = candidateReadQuery({
  args: {},
  handler: async (ctx) => {
    const { orgId } = ctx

    // Org-scoped aggregate counts for the queue header. These are inherently
    // whole-collection reductions, so they live in a dedicated query rather
    // than being recomputed from a paginated page.
    const [
      sessions,
      completedReports,
      manualReviewReports,
      recommendationSample,
    ] = await Promise.all([
      ctx.db
        .query('interviewSessions')
        .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
        .take(QUEUE_STATS_SESSION_SAMPLE),
      ctx.db
        .query('assessmentReports')
        .withIndex('by_org_id_and_status', (q) =>
          q.eq('orgId', orgId).eq('status', 'completed')
        )
        .take(QUEUE_STATS_REPORT_SAMPLE),
      ctx.db
        .query('assessmentReports')
        .withIndex('by_org_id_and_status', (q) =>
          q.eq('orgId', orgId).eq('status', 'manual_review')
        )
        .take(QUEUE_STATS_REPORT_SAMPLE),
      ctx.db
        .query('assessmentReports')
        .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
        .take(QUEUE_STATS_REPORT_SAMPLE),
    ])

    const reportsReady = completedReports.length
    const manualReview = manualReviewReports.length
    let strongSignals = 0
    for (const report of recommendationSample) {
      if (report.overallRecommendation === 'strong_yes') strongSignals += 1
    }

    return {
      totalSessions: sessions.length,
      reportsReady,
      manualReview,
      strongSignals,
    }
  },
})
