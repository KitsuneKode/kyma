import { ConvexError, v } from 'convex/values'

import { mutation, query } from '../_generated/server'
import { findUserByIdentity } from '../helpers/clerkIdentity'

export const claimCandidateInviteByToken = mutation({
  args: {
    inviteToken: v.string(),
  },
  returns: v.object({
    linked: v.boolean(),
  }),
  handler: async (ctx, { inviteToken }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.email) {
      throw new ConvexError(
        'Sign in with an email address to link this invite.'
      )
    }

    const user = await findUserByIdentity(ctx, identity)
    if (!user) {
      throw new ConvexError('User profile not found.')
    }

    const invite = await ctx.db
      .query('candidateInvites')
      .withIndex('by_invite_token', (q) => q.eq('inviteToken', inviteToken))
      .first()

    if (!invite) {
      return { linked: false }
    }

    const normalizedEmail = identity.email.trim().toLowerCase()
    if (
      invite.candidateEmail &&
      invite.candidateEmail.trim().toLowerCase() !== normalizedEmail
    ) {
      throw new ConvexError(
        'Your account email does not match this screening invite.'
      )
    }

    await ctx.db.patch(invite._id, {
      userId: user._id,
      candidateEmail: invite.candidateEmail ?? identity.email,
    })

    const session = await ctx.db
      .query('interviewSessions')
      .withIndex('by_invite', (q) => q.eq('inviteId', invite._id))
      .first()

    if (session) {
      await ctx.db.patch(session._id, { candidateUserId: user._id })
    }

    return { linked: true }
  },
})

export const linkCandidateInviteByEmail = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.email) {
      return null
    }
    const user = await findUserByIdentity(ctx, identity)
    if (!user) {
      return null
    }
    const invites = await ctx.db
      .query('candidateInvites')
      .withIndex('by_candidate_email', (q) =>
        q.eq('candidateEmail', identity.email)
      )
      .collect()
    await Promise.all(
      invites.map(async (invite) => {
        await ctx.db.patch(invite._id, {
          userId: user._id,
        })
        const session = await ctx.db
          .query('interviewSessions')
          .withIndex('by_invite', (q) => q.eq('inviteId', invite._id))
          .first()
        if (session) {
          await ctx.db.patch(session._id, { candidateUserId: user._id })
        }
      })
    )
    return { linkedInvites: invites.length }
  },
})

export const listCandidateInterviews = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError('You must be signed in to access interviews.')
    }
    const user = await findUserByIdentity(ctx, identity)
    if (!user) {
      return []
    }
    const sessions = await ctx.db
      .query('interviewSessions')
      .withIndex('by_candidate_user', (q) => q.eq('candidateUserId', user._id))
      .collect()
    return await Promise.all(
      sessions.map(async (session) => {
        const invite = await ctx.db.get(session.inviteId)
        const template = invite?.templateId
          ? await ctx.db.get(invite.templateId)
          : null
        const report = await ctx.db
          .query('assessmentReports')
          .withIndex('by_session', (q) => q.eq('sessionId', session._id))
          .first()
        return {
          sessionId: session._id,
          inviteToken: invite?.inviteToken,
          candidateName: invite?.candidateName,
          templateName: template?.name ?? 'Interview',
          status: session.state,
          inviteStatus: invite?.status,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          reportStatus: report?.status,
          recommendation: report?.overallRecommendation,
          released: report?.released ?? false,
        }
      })
    )
  },
})

export const getCandidateInterviewResult = query({
  args: {
    sessionId: v.id('interviewSessions'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError(
        'You must be signed in to access interview results.'
      )
    }
    const user = await findUserByIdentity(ctx, identity)
    if (!user) return null
    const session = await ctx.db.get(args.sessionId)
    if (!session || `${session.candidateUserId}` !== `${user._id}`) {
      throw new ConvexError('You are not authorized to access this interview.')
    }
    const report = await ctx.db
      .query('assessmentReports')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .first()
    const resultState = report?.released
      ? ('released' as const)
      : report?.status === 'manual_review'
        ? ('under_review' as const)
        : report?.status === 'processing' || session.state === 'processing'
          ? ('processing' as const)
          : ('unavailable' as const)

    return {
      sessionId: session._id,
      state: session.state,
      resultState,
      reportStatus: report?.status ?? null,
      reportReleased: report?.released ?? false,
      report: report?.released
        ? {
            status: report.status,
            recommendation: report.overallRecommendation,
            confidence: report.confidence,
            summary: report.summary,
            weightedScore: report.weightedScore,
            generatedAt: report.generatedAt,
          }
        : null,
    }
  },
})
