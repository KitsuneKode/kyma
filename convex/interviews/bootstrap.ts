import { ConvexError, v } from 'convex/values'

import { mutation, query } from '../_generated/server'
import { resolveInterviewPolicyFromInvite } from '../helpers/interviewPolicy'
import {
  ensureInvite,
  isInviteExpired,
  resolveInviteSessionPurpose,
} from '../helpers/interviewSession'

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

export const bootstrapPublicSession = mutation({
  args: {
    inviteToken: v.string(),
    participantName: v.string(),
  },
  handler: async (ctx, { inviteToken, participantName }) => {
    const invite = await ensureInvite(ctx, inviteToken)
    const { policy } = await resolveInterviewPolicyFromInvite(ctx, invite)
    const existingSession = await ctx.db
      .query('interviewSessions')
      .withIndex('by_invite', (q) => q.eq('inviteId', invite._id))
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
      if (existingSession.state === 'interrupted') {
        if (!policy.allowsResume) {
          throw new ConvexError('This screening does not allow session resume.')
        }

        const reopenedRoomName = `interview-${inviteToken}-${Date.now()}`
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
          templateName: template?.name ?? 'AI Tutor Screener',
          targetDurationMinutes: policy.targetDurationMinutes,
        }
      }

      return {
        inviteId: invite._id,
        sessionId: existingSession._id,
        roomName: existingSession.roomName,
        templateName: template?.name ?? 'AI Tutor Screener',
        targetDurationMinutes: policy.targetDurationMinutes,
      }
    }

    if (invite.eligibilityId) {
      const eligibility = await ctx.db.get(invite.eligibilityId)
      if (eligibility && eligibility.attemptCount >= policy.maxAttempts) {
        throw new ConvexError('Maximum attempts reached for this invite.')
      }
    }

    const roomName = `interview-${inviteToken}-${Date.now()}`
    const startedAt = new Date().toISOString()
    const sessionPurpose = resolveInviteSessionPurpose(invite)

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
      templateName: template?.name ?? 'AI Tutor Screener',
      targetDurationMinutes: policy.targetDurationMinutes,
    }
  },
})
