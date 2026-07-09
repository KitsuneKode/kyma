import type { Id } from '../_generated/dataModel'
import type { QueryCtx } from '../_generated/server'
import { requireOrgId, requireRecruiterCapability } from './auth'
import { requireSessionOrgId } from './processingAuth'

export const DEFAULT_TEMPLATE_NAME = 'AI Tutor Screener'

/** Shared caps for session slice reads (processing + public candidate detail). */
export const DEFAULT_SESSION_TRANSCRIPT_LIMIT = 500
export const DEFAULT_SESSION_EVENTS_LIMIT = 200
export const DEFAULT_SESSION_RECORDINGS_LIMIT = 20

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
 * Resolves org scope for authenticated recruiter review reads.
 * Pipeline callers must use {@link loadSessionReviewBaseForPipeline} instead —
 * never pass a processing key into this path.
 */
export async function resolveReviewScopeOrgId(ctx: QueryCtx) {
  await requireRecruiterCapability(ctx, 'recruiter:candidates:read')
  return await requireOrgId(ctx)
}

async function loadSessionOwnedReviewBase(
  ctx: QueryCtx,
  sessionId: Id<'interviewSessions'>,
  orgId: string
) {
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
 * Shared base loader for recruiter review detail queries. Requires recruiter
 * JWT + candidates:read. Returns null when the session is missing or not owned
 * by the caller's org.
 */
export async function loadSessionReviewBase(
  ctx: QueryCtx,
  sessionId: Id<'interviewSessions'>
) {
  const orgId = await resolveReviewScopeOrgId(ctx)
  return await loadSessionOwnedReviewBase(ctx, sessionId, orgId)
}

/**
 * Shared base loader for trusted pipeline reads. Call only from
 * `pipelineQuery` handlers after the processing key has already been validated
 * by the wrapper — this resolves org from the session without re-checking the key.
 */
export async function loadSessionReviewBaseForPipeline(
  ctx: QueryCtx,
  sessionId: Id<'interviewSessions'>
) {
  const orgId = await requireSessionOrgId(ctx, sessionId)
  return await loadSessionOwnedReviewBase(ctx, sessionId, orgId)
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
  reportId?: Id<'assessmentReports'>,
  options?: {
    transcriptLimit?: number
    eventsLimit?: number
  }
) {
  const transcriptLimit = options?.transcriptLimit
  const eventsLimit = options?.eventsLimit

  const [transcriptRaw, eventsRaw, evidence] = await Promise.all([
    transcriptLimit !== undefined
      ? ctx.db
          .query('transcriptSegments')
          .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
          .order('desc')
          .take(transcriptLimit)
      : ctx.db
          .query('transcriptSegments')
          .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
          .collect(),
    eventsLimit !== undefined
      ? ctx.db
          .query('sessionEvents')
          .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
          .order('desc')
          .take(eventsLimit)
      : ctx.db
          .query('sessionEvents')
          .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
          .collect(),
    reportId
      ? ctx.db
          .query('dimensionEvidence')
          .withIndex('by_report', (q) => q.eq('reportId', reportId))
          .take(200)
      : Promise.resolve([]),
  ])

  const transcript = sortByIsoAsc(
    transcriptLimit !== undefined ? transcriptRaw.toReversed() : transcriptRaw
  )
  const events = sortByIsoAsc(
    eventsLimit !== undefined ? eventsRaw.toReversed() : eventsRaw
  )

  return {
    transcript,
    events,
    evidence: sortByIsoAsc(evidence),
  }
}
