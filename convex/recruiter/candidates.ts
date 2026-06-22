import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'

import type { Doc } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'
import { candidateReadQuery } from '../lib/customFunctions'
import {
  getLatestReviewDecision,
  resolveTemplateName,
} from '../helpers/sessionReview'

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
      .collect()
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
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const { orgId } = ctx

    // Cursor-paginated newest-first over the org's sessions. Ordering follows
    // the index's `_creationTime` so cursors stay stable as new sessions land.
    const result = await ctx.db
      .query('interviewSessions')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .order('desc')
      .paginate(args.paginationOpts)

    const page = await Promise.all(
      result.page.map((session) => projectReviewCandidate(ctx, session))
    )

    return { ...result, page }
  },
})

export const getCandidateQueueStats = candidateReadQuery({
  args: {},
  handler: async (ctx) => {
    const { orgId } = ctx

    // Org-scoped aggregate counts for the queue header. These are inherently
    // whole-collection reductions, so they live in a dedicated query rather
    // than being recomputed from a paginated page.
    const [sessions, reports] = await Promise.all([
      ctx.db
        .query('interviewSessions')
        .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
        .collect(),
      ctx.db
        .query('assessmentReports')
        .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
        .collect(),
    ])

    let reportsReady = 0
    let manualReview = 0
    let strongSignals = 0
    for (const report of reports) {
      if (report.status === 'completed') reportsReady += 1
      if (report.status === 'manual_review') manualReview += 1
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
