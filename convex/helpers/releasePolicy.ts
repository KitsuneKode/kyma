import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { logAuditEvent } from './audit'

export type CandidateReleaseMode = 'auto' | 'manual'

import type { ReviewDecision } from '../../lib/domain/review-decision'

export type ReviewDecisionKind = ReviewDecision

export async function resolveReleaseMode(
  ctx: QueryCtx | MutationCtx,
  invite: Doc<'candidateInvites'>
): Promise<CandidateReleaseMode> {
  if (invite.batchId) {
    const batch = await ctx.db.get(invite.batchId)
    if (batch?.candidateReleaseMode === 'auto') {
      return 'auto'
    }
    if (batch?.candidateReleaseMode === 'manual') {
      return 'manual'
    }
  }

  const settings = await ctx.db
    .query('workspaceSettings')
    .withIndex('by_org_id', (q) => q.eq('orgId', invite.orgId))
    .first()

  return settings?.candidateReleaseMode ?? 'auto'
}

export function shouldAutoRelease(
  decision: ReviewDecisionKind,
  mode: CandidateReleaseMode
) {
  if (mode !== 'auto') {
    return false
  }

  return decision === 'advance' || decision === 'reject'
}

export async function releaseReportToCandidate(
  ctx: MutationCtx,
  args: {
    reportId: Id<'assessmentReports'>
    actorId?: string
    orgId: string
    sessionId: Id<'interviewSessions'>
  }
) {
  const report = await ctx.db.get(args.reportId)

  if (!report || report.orgId !== args.orgId) {
    return { released: false, alreadyReleased: false }
  }

  if (report.released) {
    return { released: true, alreadyReleased: true }
  }

  const now = new Date().toISOString()

  await ctx.db.patch(args.reportId, {
    released: true,
    releasedAt: now,
    releasedBy: args.actorId,
  })

  await logAuditEvent(ctx, {
    orgId: args.orgId,
    actorId: args.actorId,
    action: 'assessment_report.released',
    resource: `session:${args.sessionId}`,
    metadata: {
      reportId: args.reportId,
    },
  })

  return { released: true, alreadyReleased: false }
}
