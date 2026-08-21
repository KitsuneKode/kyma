import { v } from 'convex/values'

import type { QueryCtx } from '../_generated/server'
import {
  getSessionOpsWindows,
  isInviteExpiringSoon,
  isStaleSessionWithoutReport,
} from '../helpers/sessionOps'
import { recruiterQuery } from '../lib/customFunctions'

const ACTIVE_SESSION_STATES = ['connecting', 'live', 'reconnecting'] as const
const DASHBOARD_SESSION_SAMPLE = 300
const DASHBOARD_INVITE_SAMPLE = 500
const MAX_MANUAL_REVIEW_CANDIDATES = 20
const MAX_ATTENTION_ITEMS = 10
const MAX_PENDING_REPORTS = 100
const MAX_ACTIVE_SESSIONS_PER_STATE = 100

async function buildDashboardPayload(
  ctx: QueryCtx,
  orgId: string,
  nowMs: number
) {
  const { expiringUntilMs, staleBeforeMs } = getSessionOpsWindows(nowMs)
  const todayDateString = new Date(nowMs).toDateString()

  const [
    manualReviewReports,
    pendingReports,
    terminalReportGroups,
    activeSessionGroups,
    recentSessions,
    invitesSample,
    recentEvents,
  ] = await Promise.all([
    ctx.db
      .query('assessmentReports')
      .withIndex('by_org_id_and_status', (q) =>
        q.eq('orgId', orgId).eq('status', 'manual_review')
      )
      .take(MAX_MANUAL_REVIEW_CANDIDATES),
    ctx.db
      .query('assessmentReports')
      .withIndex('by_org_id_and_status', (q) =>
        q.eq('orgId', orgId).eq('status', 'pending')
      )
      .take(MAX_PENDING_REPORTS),
    // Terminal reports are not review work, but a session that has one is NOT
    // stale. Without them the attention list flagged every completed interview
    // as a problem needing attention.
    Promise.all(
      (['completed', 'manual_review', 'failed'] as const).map((status) =>
        ctx.db
          .query('assessmentReports')
          .withIndex('by_org_id_and_status', (q) =>
            q.eq('orgId', orgId).eq('status', status)
          )
          .take(DASHBOARD_SESSION_SAMPLE)
      )
    ),
    Promise.all(
      ACTIVE_SESSION_STATES.map((state) =>
        ctx.db
          .query('interviewSessions')
          .withIndex('by_org_id_and_state', (q) =>
            q.eq('orgId', orgId).eq('state', state)
          )
          .take(MAX_ACTIVE_SESSIONS_PER_STATE)
      )
    ),
    ctx.db
      .query('interviewSessions')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .order('desc')
      .take(DASHBOARD_SESSION_SAMPLE),
    ctx.db
      .query('candidateInvites')
      .withIndex('by_org_id', (q) => q.eq('orgId', orgId))
      .take(DASHBOARD_INVITE_SAMPLE),
    ctx.db
      .query('sessionEvents')
      .withIndex('by_org_id_and_created_at', (q) => q.eq('orgId', orgId))
      .order('desc')
      .take(10),
  ])

  const reports = [...manualReviewReports, ...pendingReports]
  const reportedSessionIds = new Set(
    [...reports, ...terminalReportGroups.flat()].map(
      (report) => `${report.sessionId}`
    )
  )
  const sessions = recentSessions
  const invites = invitesSample
  const activeSessions = activeSessionGroups.flat().length

  const pendingReviews = reports.length
  const expiringInvites = invites.filter((invite) =>
    isInviteExpiringSoon(invite.expiresAt, nowMs, expiringUntilMs)
  ).length
  const sessionsToday = sessions.filter((session) => {
    if (!session.startedAt) return false
    return new Date(session.startedAt).toDateString() === todayDateString
  }).length

  const manualReviewSlice = manualReviewReports.slice(
    0,
    MAX_MANUAL_REVIEW_CANDIDATES
  )
  const sessionIds = [
    ...new Set(manualReviewSlice.map((report) => report.sessionId)),
  ]
  const sessionsForReports = await Promise.all(
    sessionIds.map((sessionId) => ctx.db.get(sessionId))
  )
  const sessionById = new Map(
    sessionsForReports
      .filter((session) => session !== null)
      .map((session) => [session._id, session])
  )
  const inviteIds = [
    ...new Set([...sessionById.values()].map((session) => session.inviteId)),
  ]
  const invitesForReports = await Promise.all(
    inviteIds.map((inviteId) => ctx.db.get(inviteId))
  )
  const inviteById = new Map(
    invitesForReports
      .filter((invite) => invite !== null)
      .map((invite) => [invite._id, invite])
  )

  const manualReviewCandidates = manualReviewSlice.map((report) => {
    const session = sessionById.get(report.sessionId)
    const invite = session ? inviteById.get(session.inviteId) : undefined
    return {
      reportId: report._id,
      sessionId: report.sessionId,
      candidateName: invite?.candidateName ?? 'Candidate',
    }
  })

  return {
    counts: {
      pendingReviews,
      manualReviews: manualReviewReports.length,
      activeSessions,
      expiringInvites,
      sessionsToday,
    },
    needsAttention: {
      manualReviewCandidates,
      invitesExpiringSoon: invites
        .filter((invite) =>
          isInviteExpiringSoon(invite.expiresAt, nowMs, expiringUntilMs)
        )
        .slice(0, MAX_ATTENTION_ITEMS)
        .map((invite) => ({
          inviteId: invite._id,
          inviteToken: invite.inviteToken,
          expiresAt: invite.expiresAt,
          candidateName: invite.candidateName,
        })),
      staleSessions: sessions
        .filter((session) =>
          isStaleSessionWithoutReport(
            session.startedAt,
            staleBeforeMs,
            reportedSessionIds.has(`${session._id}`)
          )
        )
        .slice(0, MAX_ATTENTION_ITEMS)
        .map((session) => ({
          sessionId: session._id,
          startedAt: session.startedAt,
        })),
    },
    recentActivity: recentEvents.map((event) => ({
      id: event._id,
      type: event.type,
      detail: event.detail,
      sessionId: event.sessionId,
      createdAt: event.createdAt,
    })),
  }
}

export const getDashboardCounts = recruiterQuery({
  args: {
    nowMs: v.number(),
  },
  handler: async (ctx, { nowMs }) => {
    const payload = await buildDashboardPayload(ctx, ctx.orgId, nowMs)
    return payload.counts
  },
})

export const getDashboardLiveSlice = recruiterQuery({
  args: {
    nowMs: v.number(),
  },
  handler: async (ctx, { nowMs }) => {
    const payload = await buildDashboardPayload(ctx, ctx.orgId, nowMs)
    return {
      needsAttention: payload.needsAttention,
      recentActivity: payload.recentActivity,
    }
  },
})

export const getDashboardSummary = recruiterQuery({
  args: {
    nowMs: v.number(),
  },
  handler: async (ctx, { nowMs }) => {
    return await buildDashboardPayload(ctx, ctx.orgId, nowMs)
  },
})
