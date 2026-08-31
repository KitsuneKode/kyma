import { ConvexError, v } from 'convex/values'

import { mutation, query } from '../_generated/server'
import { resolveInterviewPolicyFromInvite } from '../helpers/interviewPolicy'
import {
  ensureInvite,
  isInviteExpired,
  resolveInviteSessionPurpose,
} from '../helpers/interviewSession'
import { resolveTemplateName } from '../helpers/sessionReview'
import { quotasForPlan, resolveOrgPlanForOrg } from '../helpers/orgPlan'
import { currentUsagePeriod, getUsageForPeriod } from '../helpers/usageRollup'

export const getInviteBootstrapByokSummary = query({
  args: {
    inviteToken: v.string(),
  },
  returns: v.object({
    providerKeys: v.array(
      v.object({
        provider: v.string(),
        keyId: v.string(),
      })
    ),
  }),
  handler: async (ctx, { inviteToken }) => {
    const invite = await ctx.db
      .query('candidateInvites')
      .withIndex('by_invite_token', (q) => q.eq('inviteToken', inviteToken))
      .first()

    if (!invite) {
      return { providerKeys: [] }
    }

    const settings = await ctx.db
      .query('workspaceSettings')
      .withIndex('by_org_id', (q) => q.eq('orgId', invite.orgId))
      .first()

    return {
      providerKeys: (settings?.providerKeys ?? []).map((item) => ({
        provider: item.provider,
        keyId: item.keyId,
      })),
    }
  },
})

/**
 * Persist client-observed connection state. Called when LiveKit reports
 * reconnecting/interrupted so the server does not stay in connecting/live
 * waiting solely for a webhook that may be delayed or lost.
 */
export const updateSessionConnectionState = mutation({
  args: {
    inviteToken: v.string(),
    sessionId: v.id('interviewSessions'),
    state: v.union(
      v.literal('reconnecting'),
      v.literal('interrupted'),
      v.literal('live')
    ),
  },
  handler: async (ctx, { inviteToken, sessionId, state }) => {
    const invite = await ensureInvite(ctx, inviteToken)
    const session = await ctx.db.get(sessionId)
    if (!session || `${session.inviteId}` !== `${invite._id}`) {
      throw new ConvexError('Session not found for invite.')
    }
    if (['processing', 'completed', 'failed'].includes(session.state))
      return null
    // Only allow forward progress: connecting -> live/reconnecting, live -> reconnecting/interrupted
    const allowed: Record<string, string[]> = {
      connecting: ['live', 'reconnecting', 'interrupted'],
      live: ['reconnecting', 'interrupted'],
      reconnecting: ['live', 'interrupted', 'connecting'],
      interrupted: ['connecting', 'live'],
    }
    const nextAllowed = allowed[session.state] ?? []
    if (!nextAllowed.includes(state)) return null
    await ctx.db.patch(sessionId, { state: state as typeof session.state })
    await ctx.db.insert('sessionEvents', {
      orgId: session.orgId,
      sessionId,
      type: `connection-${state}`,
      detail: `Client reported connection state ${state}`,
      source: 'candidate-client',
      createdAt: new Date().toISOString(),
    })
    return { state }
  },
})

/**
 * Promote a session from connecting to live when the client has successfully
 * joined the LiveKit room. This is a fallback for the webhook path.
 */
export const promoteSessionToLive = mutation({
  args: {
    inviteToken: v.string(),
    sessionId: v.id('interviewSessions'),
  },
  handler: async (ctx, { inviteToken, sessionId }) => {
    const invite = await ensureInvite(ctx, inviteToken)
    const session = await ctx.db.get(sessionId)
    if (!session || `${session.inviteId}` !== `${invite._id}`) {
      throw new ConvexError('Session not found for invite.')
    }
    if (session.state !== 'connecting' && session.state !== 'reconnecting')
      return null
    await ctx.db.patch(sessionId, {
      state: 'live',
      lastLiveStartedAt: new Date().toISOString(),
    })
    await ctx.db.insert('sessionEvents', {
      orgId: session.orgId,
      sessionId,
      type: 'session-promoted-live',
      detail: 'Session promoted to live via client join',
      source: 'candidate-client',
      createdAt: new Date().toISOString(),
    })
    return { state: 'live' as const }
  },
})

export const bootstrapPublicSession = mutation({
  args: {
    inviteToken: v.string(),
    participantName: v.string(),
  },
  returns: v.object({
    inviteId: v.id('candidateInvites'),
    sessionId: v.id('interviewSessions'),
    roomName: v.string(),
    templateName: v.string(),
    targetDurationMinutes: v.number(),
  }),
  handler: async (ctx, { inviteToken, participantName }) => {
    const invite = await ensureInvite(ctx, inviteToken)
    const { policy } = await resolveInterviewPolicyFromInvite(ctx, invite)
    // Newest-first: if a race created two sessions, the latest is authoritative.
    const existingSession = await ctx.db
      .query('interviewSessions')
      .withIndex('by_invite', (q) => q.eq('inviteId', invite._id))
      .order('desc')
      .first()

    if (invite.status === 'expired' || isInviteExpired(invite.expiresAt)) {
      if (invite.status !== 'expired') {
        await ctx.db.patch(invite._id, {
          status: 'expired',
        })
      }

      throw new ConvexError('This interview link has expired.')
    }

    if (
      invite.status === 'completed' ||
      existingSession?.state === 'processing' ||
      existingSession?.state === 'completed'
    ) {
      if (invite.status !== 'completed') {
        await ctx.db.patch(invite._id, {
          status: 'completed',
        })
      }

      throw new ConvexError('This interview has already been submitted.')
    }

    // Cap metered usage before any room is created. Checked ahead of the
    // resume path too, so an exhausted workspace cannot keep reopening a
    // session. The message is candidate-facing - it must not leak plan detail.
    const plan = await resolveOrgPlanForOrg(ctx, invite.orgId)
    const quotas = quotasForPlan(plan)
    const usage = await getUsageForPeriod(ctx, {
      orgId: invite.orgId,
      period: currentUsagePeriod(),
    })

    if (usage.interviewMinutes >= quotas.maxInterviewMinutesPerMonth) {
      throw new ConvexError(
        'This workspace has reached its monthly interview limit. Please contact the hiring team.'
      )
    }

    if (!invite.candidateName) {
      await ctx.db.patch(invite._id, {
        candidateName: participantName,
        status: 'opened',
      })
    } else if (invite.status === 'created') {
      await ctx.db.patch(invite._id, {
        status: 'opened',
      })
    }

    const template = await ctx.db.get(invite.templateId)

    if (existingSession && existingSession.roomName) {
      if (
        existingSession.participantName &&
        existingSession.participantName !== participantName
      ) {
        throw new ConvexError(
          'This invite is already attached to another candidate participant.'
        )
      }
      if (
        existingSession.state === 'interrupted' ||
        existingSession.state === 'reconnecting'
      ) {
        if (!policy.allowsResume) {
          throw new ConvexError('This screening does not allow session resume.')
        }

        const reopenedRoomName = `interview-${existingSession._id}-${Date.now()}`
        const reopenedAt = new Date().toISOString()

        await ctx.db.patch(existingSession._id, {
          state: 'connecting',
          roomName: reopenedRoomName,
          reconnectCount: (existingSession.reconnectCount ?? 0) + 1,
          endedAt: undefined,
        })

        await ctx.db.insert('sessionEvents', {
          orgId: existingSession.orgId,
          sessionId: existingSession._id,
          type: 'room-token-requested',
          detail: `Bootstrap retried by ${participantName} after interruption`,
          createdAt: reopenedAt,
        })

        return {
          inviteId: invite._id,
          sessionId: existingSession._id,
          roomName: reopenedRoomName,
          templateName: resolveTemplateName(template?.name),
          targetDurationMinutes: policy.targetDurationMinutes,
        }
      }

      return {
        inviteId: invite._id,
        sessionId: existingSession._id,
        roomName: existingSession.roomName,
        templateName: resolveTemplateName(template?.name),
        targetDurationMinutes: policy.targetDurationMinutes,
      }
    }

    if (invite.eligibilityId) {
      const eligibility = await ctx.db.get(invite.eligibilityId)
      if (eligibility && eligibility.attemptCount >= policy.maxAttempts) {
        throw new ConvexError('Maximum attempts reached for this invite.')
      }
    }

    const roomName = `interview-${invite._id}-${Date.now()}`
    const startedAt = new Date().toISOString()
    const sessionPurpose = resolveInviteSessionPurpose(invite)

    // Freeze policy snapshot at session start so later template edits do not retroactively change scoring.
    const policySnapshot = {
      targetDurationMinutes: policy.targetDurationMinutes,
      allowsResume: policy.allowsResume,
      maxAttempts: policy.maxAttempts,
      rubricVersion: template?.rubricVersion ?? 'v1',
      templateId: `${invite.templateId}`,
      templateName: resolveTemplateName(template?.name),
      interviewStyleMode: template?.interviewStyleMode ?? 'standard',
    }
    const sessionId = await ctx.db.insert('interviewSessions', {
      orgId: invite.orgId,
      inviteId: invite._id,
      state: 'connecting',
      provider: 'livekit',
      roomName,
      participantName,
      startedAt,
      reconnectCount: 0,
      activeDurationMs: 0,
      sessionPurpose,
      candidateUserId: invite.userId,
      policySnapshot,
      interviewStyleMode: template?.interviewStyleMode ?? 'standard',
    })

    await ctx.db.patch(invite._id, {
      status: 'in_progress',
    })

    if (invite.eligibilityId) {
      const eligibility = await ctx.db.get(invite.eligibilityId)

      if (eligibility) {
        await ctx.db.patch(invite.eligibilityId, {
          status: 'in_progress',
          attemptCount: eligibility.attemptCount + 1,
        })
      }
    }

    await ctx.db.insert('sessionEvents', {
      orgId: invite.orgId,
      sessionId,
      type: 'room-token-requested',
      detail: `Bootstrap requested by ${participantName}`,
      createdAt: startedAt,
    })

    return {
      inviteId: invite._id,
      sessionId,
      roomName,
      templateName: resolveTemplateName(template?.name),
      targetDurationMinutes: policy.targetDurationMinutes,
    }
  },
})
