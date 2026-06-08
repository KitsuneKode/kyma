import { ConvexError } from 'convex/values'

import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

type AccessCtx = QueryCtx | MutationCtx

export async function getSessionForOrg(
  ctx: AccessCtx,
  orgId: string,
  sessionId: Id<'interviewSessions'>
) {
  const session = await ctx.db.get(sessionId)

  if (!session || session.orgId !== orgId) {
    throw new ConvexError('Interview session not found for this organization.')
  }

  return session
}

export async function assertOrgOwnsSession(
  ctx: AccessCtx,
  orgId: string,
  sessionId: Id<'interviewSessions'>
) {
  return await getSessionForOrg(ctx, orgId, sessionId)
}

export async function getReportForOrg(
  ctx: AccessCtx,
  orgId: string,
  reportId: Id<'assessmentReports'>
) {
  const report = await ctx.db.get(reportId)

  if (!report || report.orgId !== orgId) {
    throw new ConvexError('Assessment report not found for this organization.')
  }

  return report
}

export async function assertOrgOwnsReport(
  ctx: AccessCtx,
  orgId: string,
  reportId: Id<'assessmentReports'>
) {
  return await getReportForOrg(ctx, orgId, reportId)
}

export function assertReportBelongsToSession(
  report: Doc<'assessmentReports'>,
  sessionId: Id<'interviewSessions'>
) {
  if (report.sessionId !== sessionId) {
    throw new ConvexError('Assessment report does not belong to this session.')
  }
}

export async function assertOrgOwnsInvite(
  ctx: AccessCtx,
  orgId: string,
  inviteId: Id<'candidateInvites'>
) {
  const invite = await ctx.db.get(inviteId)

  if (!invite || invite.orgId !== orgId) {
    throw new ConvexError('Invite not found for this organization.')
  }

  return invite
}
