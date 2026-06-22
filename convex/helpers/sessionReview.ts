import type { Id } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'
import { requireOrgId, requireRecruiterCapability } from './auth'
import {
  hasTrustedProcessingKey,
  resolveOrgIdForPipelineWrite,
} from './processingAuth'

export const DEFAULT_TEMPLATE_NAME = 'AI Tutor Screener'

export function resolveTemplateName(name: string | null | undefined) {
  return name ?? DEFAULT_TEMPLATE_NAME
}

export function sortByIsoAsc<
  T extends { createdAt?: string; startedAt?: string },
>(items: T[]) {
  return [...items].toSorted((left, right) =>
    (left.createdAt ?? left.startedAt ?? '').localeCompare(
      right.createdAt ?? right.startedAt ?? ''
    )
  )
}

export async function getLatestReviewDecision(
  ctx: QueryCtx,
  sessionId: Id<'interviewSessions'>
) {
  return await ctx.db
    .query('reviewDecisions')
    .withIndex('by_session_and_created_at', (q) => q.eq('sessionId', sessionId))
    .order('desc')
    .first()
}

/**
 * Resolves the caller's org scope for review/processing reads. Trusted pipeline
 * callers (with a valid processing key) resolve the org from the session; human
 * recruiters fall back to authenticated admin identity + org membership.
 */
export async function resolveReviewScopeOrgId(
  ctx: QueryCtx,
  sessionId: Id<'interviewSessions'>,
  processingKey?: string
) {
  if (hasTrustedProcessingKey(processingKey)) {
    return await resolveOrgIdForPipelineWrite(ctx, sessionId, processingKey)
  }
  await requireRecruiterCapability(ctx, 'recruiter:candidates:read')
  return await requireOrgId(ctx)
}

/**
 * Shared base loader for the session processing + recruiter review detail
 * queries. Centralizes auth scoping, the org-ownership guard, and the common
 * session/invite/template/report fetch so both read paths stay in sync. Returns
 * null when the session is missing or not owned by the caller's org.
 */
export async function loadSessionReviewBase(
  ctx: QueryCtx,
  sessionId: Id<'interviewSessions'>,
  processingKey?: string
) {
  const orgId = await resolveReviewScopeOrgId(ctx, sessionId, processingKey)

  const session = await ctx.db.get(sessionId)
  if (!session || session.orgId !== orgId) {
    return null
  }

  const invite = await ctx.db.get(session.inviteId)
  const template = invite ? await ctx.db.get(invite.templateId) : null
  const report = await ctx.db
    .query('assessmentReports')
    .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
    .first()

  return { orgId, session, invite, template, report }
}

/**
 * Shared fetch + ascending sort for the high-churn session review slices
 * (transcript, events, and report evidence). Centralizing the index lookups and
 * ordering keeps the processing, recruiter-review, and report-chat read paths
 * from drifting on which index or sort they use. Each caller still projects the
 * fields its own view needs.
 */
export async function loadSessionReviewSlices(
  ctx: QueryCtx,
  sessionId: Id<'interviewSessions'>,
  reportId?: Id<'assessmentReports'>
) {
  const [transcript, events, evidence] = await Promise.all([
    ctx.db
      .query('transcriptSegments')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
      .collect(),
    ctx.db
      .query('sessionEvents')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
      .collect(),
    reportId
      ? ctx.db
          .query('dimensionEvidence')
          .withIndex('by_report', (q) => q.eq('reportId', reportId))
          .collect()
      : Promise.resolve([]),
  ])

  return {
    transcript: sortByIsoAsc(transcript),
    events: sortByIsoAsc(events),
    evidence: sortByIsoAsc(evidence),
  }
}
