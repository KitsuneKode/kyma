import { v } from 'convex/values'

import type { QueryCtx } from '../_generated/server'
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
  const in24h = nowMs + 24 * 60 * 60 * 1000
  const oneHourAgo = nowMs - 60 * 60 * 1000
  const todayDateString = new Date(nowMs).toDateString()

  const [
    manualReviewReports,
    pendingReports,
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
  const sessions = recentSessions
  const invites = invitesSample
  const activeSessions = activeSessionGroups.flat().length

  const pendingReviews = reports.length
  const expiringInvites = invites.filter((invite) => {
    const expiry = Date.parse(invite.expiresAt)
    return Number.isFinite(expiry) && expiry > nowMs && expiry <= in24h
  }).length
  const sessionsToday = sessions.filter((session) => {
    if (!session.startedAt) return false
    return new Date(session.startedAt).toDateString() === todayDateString
  }).length

  const reportBySession = new Map(
    reports.map((report) => [`${report.sessionId}`, report])
  )

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
        .filter((invite) => {
          const expiry = Date.parse(invite.expiresAt)
          return Number.isFinite(expiry) && expiry > nowMs && expiry <= in24h
        })
        .slice(0, MAX_ATTENTION_ITEMS)
        .map((invite) => ({
          inviteId: invite._id,
          inviteToken: invite.inviteToken,
          expiresAt: invite.expiresAt,
          candidateName: invite.candidateName,
        })),
      staleSessions: sessions
        .filter((session) => {
          if (!session.startedAt) return false
          if (reportBySession.has(`${session._id}`)) return false
          return Date.parse(session.startedAt) < oneHourAgo
        })
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
