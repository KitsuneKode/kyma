import { ConvexError, v } from 'convex/values'

import { mutation, query } from '../_generated/server'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { findUserByIdentity } from '../helpers/clerkIdentity'
import { ensureSystemPracticeTemplate } from '../helpers/systemTemplates'
import {
  practiceJobFamilyValidator,
  reportStatusValidator,
} from '../validators'
import {
  isPracticeJobFamily,
  type PracticeJobFamily,
} from '../../lib/domain/job-families'
import { SYSTEM_ORG_ID } from '../../lib/interview/session-purpose'
import { formatCandidateScoreBand } from '../../lib/candidate/result-copy'
import {
  PRACTICE_PACKS,
  PRACTICE_SESSION_LIMIT,
  PRACTICE_SESSION_WINDOW_MS,
} from '../../lib/practice/packs'

function resolvePracticeCreatedAt(invite: {
  practiceCreatedAt?: number
  inviteToken: string
}): number | null {
  if (typeof invite.practiceCreatedAt === 'number') {
    return invite.practiceCreatedAt
  }
  const parts = invite.inviteToken.split('-')
  const encoded = parts[parts.length - 1]
  if (!encoded) {
    return null
  }
  const parsed = Number.parseInt(encoded, 36)
  return Number.isFinite(parsed) ? parsed : null
}

function resolvePracticeJobFamily(invite: {
  practiceJobFamily?: string
  inviteToken: string
}): PracticeJobFamily | undefined {
  if (
    invite.practiceJobFamily &&
    isPracticeJobFamily(invite.practiceJobFamily)
  ) {
    return invite.practiceJobFamily
  }
  const tokenFamily = invite.inviteToken.split('-')[1]
  if (tokenFamily && isPracticeJobFamily(tokenFamily)) {
    return tokenFamily
  }
  return undefined
}

async function countRecentPracticeSessions(
  ctx: MutationCtx | QueryCtx,
  userId: Id<'users'>
) {
  const cutoff = Date.now() - PRACTICE_SESSION_WINDOW_MS
  const invites = await ctx.db
    .query('candidateInvites')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect()

  return invites.filter((invite) => {
    if (invite.sessionPurpose !== 'mock') {
      return false
    }
    const createdAt = resolvePracticeCreatedAt(invite)
    if (createdAt === null || createdAt < cutoff) {
      return false
    }
    // Abandoned invites (never opened) do not consume the daily quota.
    if (invite.status === 'created') {
      return false
    }
    return true
  }).length
}

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

export const listPracticePacks = query({
  args: {},
  returns: v.array(
    v.object({
      id: practiceJobFamilyValidator,
      title: v.string(),
      description: v.string(),
      durationMinutes: v.number(),
      readinessRecommended: v.boolean(),
    })
  ),
  handler: async () => {
    return PRACTICE_PACKS.map((pack) => ({ ...pack }))
  },
})

export const getPracticeUsage = query({
  args: {},
  returns: v.object({
    sessionsUsed: v.number(),
    sessionsLimit: v.number(),
    windowHours: v.number(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return {
        sessionsUsed: 0,
        sessionsLimit: PRACTICE_SESSION_LIMIT,
        windowHours: PRACTICE_SESSION_WINDOW_MS / (1000 * 60 * 60),
      }
    }
    const user = await findUserByIdentity(ctx, identity)
    if (!user) {
      return {
        sessionsUsed: 0,
        sessionsLimit: PRACTICE_SESSION_LIMIT,
        windowHours: PRACTICE_SESSION_WINDOW_MS / (1000 * 60 * 60),
      }
    }
    const sessionsUsed = await countRecentPracticeSessions(ctx, user._id)
    return {
      sessionsUsed,
      sessionsLimit: PRACTICE_SESSION_LIMIT,
      windowHours: PRACTICE_SESSION_WINDOW_MS / (1000 * 60 * 60),
    }
  },
})

export const createMockInterview = mutation({
  args: {
    jobFamily: v.optional(practiceJobFamilyValidator),
    templateId: v.optional(v.id('assessmentTemplates')),
  },
  returns: v.object({
    inviteToken: v.string(),
    sessionId: v.optional(v.id('interviewSessions')),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError('Sign in to try a mock interview.')
    }

    const user = await findUserByIdentity(ctx, identity)
    if (!user) {
      throw new ConvexError('User profile not found.')
    }

    const recentCount = await countRecentPracticeSessions(ctx, user._id)
    if (recentCount >= PRACTICE_SESSION_LIMIT) {
      throw new ConvexError(
        `Practice limit reached (${PRACTICE_SESSION_LIMIT} sessions per 24 hours). Try again tomorrow.`
      )
    }

    const activeSessions = await ctx.db
      .query('interviewSessions')
      .withIndex('by_candidate_user', (q) => q.eq('candidateUserId', user._id))
      .collect()

    for (const activeSession of activeSessions) {
      if (
        activeSession.sessionPurpose !== 'mock' ||
        ['processing', 'completed', 'failed'].includes(activeSession.state)
      ) {
        continue
      }

      const invite = await ctx.db.get(activeSession.inviteId)
      if (
        invite &&
        invite.status !== 'completed' &&
        invite.status !== 'expired'
      ) {
        return {
          inviteToken: invite.inviteToken,
          sessionId: activeSession._id,
        }
      }
    }

    const jobFamily: PracticeJobFamily =
      args.jobFamily ?? 'software_engineering'
    let template = await ensureSystemPracticeTemplate(ctx, jobFamily)
    if (args.templateId) {
      const selected = await ctx.db.get(args.templateId)
      if (selected && selected.orgId === SYSTEM_ORG_ID) {
        template = selected
      }
    }

    const now = Date.now()
    const inviteToken = `mock-${jobFamily}-${user._id}-${now.toString(36)}`
    const expiresAt = new Date(now + 1000 * 60 * 60 * 24).toISOString()

    const inviteId = await ctx.db.insert('candidateInvites', {
      orgId: SYSTEM_ORG_ID,
      inviteToken,
      sessionPurpose: 'mock',
      practiceJobFamily: jobFamily,
      practiceCreatedAt: now,
      candidateName: user.name ?? identity.name ?? 'Candidate',
      candidateEmail: identity.email,
      userId: user._id,
      templateId: template._id,
      status: 'created',
      expiresAt,
    })

    const invite = await ctx.db.get(inviteId)
    if (!invite) {
      throw new ConvexError('Unable to create mock interview invite.')
    }

    return { inviteToken: invite.inviteToken, sessionId: undefined }
  },
})

export const getPracticeSessionSummary = query({
  args: {
    sessionId: v.id('interviewSessions'),
  },
  returns: v.union(
    v.object({
      sessionId: v.id('interviewSessions'),
      templateName: v.string(),
      jobFamily: v.optional(practiceJobFamilyValidator),
      state: v.string(),
      processingState: v.union(
        v.literal('processing'),
        v.literal('ready'),
        v.literal('unavailable')
      ),
      tips: v.array(v.string()),
      strengths: v.array(v.string()),
      focusAreas: v.array(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError('Sign in to view practice feedback.')
    }
    const user = await findUserByIdentity(ctx, identity)
    if (!user) {
      return null
    }

    const session = await ctx.db.get(args.sessionId)
    if (!session || session.candidateUserId !== user._id) {
      throw new ConvexError('Practice session not found.')
    }
    if (session.sessionPurpose !== 'mock') {
      throw new ConvexError('This session is not a practice interview.')
    }

    const invite = await ctx.db.get(session.inviteId)
    const template = invite?.templateId
      ? await ctx.db.get(invite.templateId)
      : null
    const report = await ctx.db
      .query('assessmentReports')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .first()

    const jobFamily = invite
      ? resolvePracticeJobFamily({
          practiceJobFamily: invite.practiceJobFamily,
          inviteToken: invite.inviteToken,
        })
      : undefined

    const processingState =
      report?.status === 'completed' || report?.status === 'manual_review'
        ? ('ready' as const)
        : session.state === 'processing' || report?.status === 'processing'
          ? ('processing' as const)
          : session.state === 'completed' && !report
            ? ('processing' as const)
            : ('unavailable' as const)

    const strengths = (report?.topStrengths ?? []).filter(
      (item) => !/\b(hire|reject|advance)\b/i.test(item)
    )
    const focusAreas = (report?.topConcerns ?? []).filter(
      (item) => !/\b(hire|reject|advance)\b/i.test(item)
    )
    const tips = [
      strengths.length > 0
        ? `Lean into what worked: ${strengths.slice(0, 2).join(', ')}.`
        : 'Lead with a clear structure before diving into details.',
      focusAreas.length > 0
        ? `Next rep, tighten: ${focusAreas.slice(0, 2).join(', ')}.`
        : 'Pause briefly after each question to organize your answer.',
      'Practice interviews are private learning reps — no hiring outcome is attached.',
    ]

    return {
      sessionId: session._id,
      templateName: template?.name ?? 'Practice interview',
      jobFamily,
      state: session.state,
      processingState,
      tips,
      strengths,
      focusAreas,
    }
  },
})

export const linkCandidateInviteByEmail = mutation({
  args: {},
  returns: v.union(
    v.object({
      linkedInvites: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.email) {
      return null
    }
    const user = await findUserByIdentity(ctx, identity)
    if (!user) {
      return null
    }
    const normalizedEmail = identity.email.trim().toLowerCase()
    const invites = await ctx.db
      .query('candidateInvites')
      .withIndex('by_candidate_email', (q) =>
        q.eq('candidateEmail', normalizedEmail)
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
  args: {
    purpose: v.optional(
      v.union(v.literal('screening'), v.literal('practice'), v.literal('all'))
    ),
  },
  returns: v.array(
    v.object({
      sessionId: v.id('interviewSessions'),
      inviteToken: v.optional(v.string()),
      sessionPurpose: v.optional(
        v.union(v.literal('screening'), v.literal('demo'), v.literal('mock'))
      ),
      candidateName: v.optional(v.string()),
      templateName: v.string(),
      status: v.string(),
      inviteStatus: v.optional(v.string()),
      startedAt: v.optional(v.string()),
      endedAt: v.optional(v.string()),
      reportStatus: v.optional(v.string()),
      recommendation: v.optional(v.string()),
      released: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const purpose = args.purpose ?? 'screening'
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

    const filteredSessions = sessions.filter((session) => {
      const sessionPurpose = session.sessionPurpose
      if (purpose === 'all') {
        return true
      }
      if (purpose === 'practice') {
        return sessionPurpose === 'mock'
      }
      return sessionPurpose !== 'mock'
    })

    const inviteIds = [
      ...new Set(filteredSessions.map((session) => session.inviteId)),
    ]
    const invites = await Promise.all(
      inviteIds.map((inviteId) => ctx.db.get(inviteId))
    )
    const inviteById = new Map(
      inviteIds
        .map((inviteId, index) => [inviteId, invites[index]] as const)
        .filter(
          (
            entry
          ): entry is [(typeof entry)[0], NonNullable<(typeof entry)[1]>] =>
            Boolean(entry[1])
        )
    )

    const templateIds = [
      ...new Set(
        [...inviteById.values()]
          .map((invite) => invite.templateId)
          .filter((templateId): templateId is NonNullable<typeof templateId> =>
            Boolean(templateId)
          )
      ),
    ]
    const templates = await Promise.all(
      templateIds.map((templateId) => ctx.db.get(templateId))
    )
    const templateById = new Map(
      templateIds
        .map((templateId, index) => [templateId, templates[index]] as const)
        .filter(
          (
            entry
          ): entry is [(typeof entry)[0], NonNullable<(typeof entry)[1]>] =>
            Boolean(entry[1])
        )
    )

    const reports = await Promise.all(
      filteredSessions.map((session) =>
        ctx.db
          .query('assessmentReports')
          .withIndex('by_session', (q) => q.eq('sessionId', session._id))
          .first()
      )
    )

    return filteredSessions.map((session, index) => {
      const invite = inviteById.get(session.inviteId)
      const template = invite?.templateId
        ? templateById.get(invite.templateId)
        : null
      const report = reports[index] ?? null
      return {
        sessionId: session._id,
        inviteToken: invite?.inviteToken,
        sessionPurpose: session.sessionPurpose ?? invite?.sessionPurpose,
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
  },
})

const recentPracticeSessionValidator = v.object({
  sessionId: v.id('interviewSessions'),
  templateName: v.string(),
  status: v.string(),
  startedAt: v.optional(v.string()),
  jobFamily: v.optional(practiceJobFamilyValidator),
})

export const listRecentPracticeSessions = query({
  args: {},
  returns: v.array(recentPracticeSessionValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError('Sign in to view practice history.')
    }
    const user = await findUserByIdentity(ctx, identity)
    if (!user) {
      return []
    }

    const sessions = await ctx.db
      .query('interviewSessions')
      .withIndex('by_candidate_user', (q) => q.eq('candidateUserId', user._id))
      .order('desc')
      .take(40)

    const practiceSessions = sessions
      .filter((session) => session.sessionPurpose === 'mock')
      .slice(0, 20)

    const results = await Promise.all(
      practiceSessions.map(async (session) => {
        const invite = await ctx.db.get(session.inviteId)
        const template = invite?.templateId
          ? await ctx.db.get(invite.templateId)
          : null
        const jobFamily = invite
          ? resolvePracticeJobFamily({
              practiceJobFamily: invite.practiceJobFamily,
              inviteToken: invite.inviteToken,
            })
          : undefined

        return {
          sessionId: session._id,
          templateName: template?.name ?? 'Practice interview',
          status: session.state,
          startedAt: session.startedAt,
          jobFamily,
        }
      })
    )

    return results
  },
})

export const getCandidateInterviewResult = query({
  args: {
    sessionId: v.id('interviewSessions'),
  },
  returns: v.union(
    v.object({
      sessionId: v.id('interviewSessions'),
      state: v.string(),
      resultState: v.union(
        v.literal('released'),
        v.literal('under_review'),
        v.literal('processing'),
        v.literal('unavailable')
      ),
      reportStatus: v.union(reportStatusValidator, v.null()),
      reportReleased: v.boolean(),
      templateName: v.string(),
      startedAt: v.optional(v.string()),
      endedAt: v.optional(v.string()),
      timeline: v.array(
        v.object({
          id: v.id('sessionEvents'),
          type: v.string(),
          detail: v.string(),
          createdAt: v.string(),
        })
      ),
      report: v.union(
        v.object({
          status: v.string(),
          recommendation: v.optional(v.string()),
          confidence: v.optional(v.string()),
          summary: v.optional(v.string()),
          weightedScore: v.optional(v.number()),
          generatedAt: v.optional(v.string()),
          rubricSummary: v.union(
            v.array(
              v.object({
                dimension: v.string(),
                score: v.number(),
                band: v.string(),
              })
            ),
            v.null()
          ),
          strengths: v.array(v.string()),
          growthAreas: v.array(v.string()),
        }),
        v.null()
      ),
    }),
    v.null()
  ),
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
    const invite = await ctx.db.get(session.inviteId)
    const template = invite?.templateId
      ? await ctx.db.get(invite.templateId)
      : null
    const events = await ctx.db
      .query('sessionEvents')
      .withIndex('by_session_and_created_at', (q) =>
        q.eq('sessionId', args.sessionId)
      )
      .order('desc')
      .take(12)
    const resultState = report?.released
      ? ('released' as const)
      : report?.status === 'manual_review'
        ? ('under_review' as const)
        : report?.status === 'processing' || session.state === 'processing'
          ? ('processing' as const)
          : ('unavailable' as const)

    const candidateTimelineTypes = new Set([
      'invite-opened',
      'preflight-started',
      'preflight-completed',
      'participant-connecting',
      'participant-joined',
      'participant-left',
      'processing-started',
      'processing-completed',
      'teaching-simulation-started',
      'teaching-simulation-completed',
      'session-failed',
    ])

    return {
      sessionId: session._id,
      state: session.state,
      resultState,
      reportStatus: report?.status ?? null,
      reportReleased: report?.released ?? false,
      templateName: template?.name ?? 'Interview',
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      timeline: events
        .filter((event) => candidateTimelineTypes.has(event.type))
        .map((event) => ({
          id: event._id,
          type: event.type,
          detail: event.detail,
          createdAt: event.createdAt,
        })),
      report: report?.released
        ? {
            status: report.status,
            recommendation: report.overallRecommendation,
            confidence: report.confidence,
            summary: report.summary,
            weightedScore: report.weightedScore,
            generatedAt: report.generatedAt,
            rubricSummary:
              report.dimensionScores?.map((item) => ({
                dimension: item.dimension,
                score: item.score,
                band: formatCandidateScoreBand(item.score),
              })) ?? null,
            strengths: report.topStrengths ?? [],
            growthAreas: report.topConcerns ?? [],
          }
        : null,
    }
  },
})
