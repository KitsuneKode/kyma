import { v } from 'convex/values'

import { internalMutation, internalQuery } from './_generated/server'

/**
 * Minimal invite/session seed for local integration verification.
 * Internal-only — not exposed to clients.
 */
export const seedPublicInvite = internalMutation({
  args: {
    inviteToken: v.string(),
    orgId: v.optional(v.string()),
    participantName: v.optional(v.string()),
    withLiveSession: v.optional(v.boolean()),
  },
  returns: v.object({
    inviteId: v.id('candidateInvites'),
    sessionId: v.optional(v.id('interviewSessions')),
    roomName: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const orgId = args.orgId ?? 'org_integration'
    const participantName = args.participantName ?? 'Integration Candidate'

    const templateId = await ctx.db.insert('assessmentTemplates', {
      orgId,
      name: 'Integration template',
      role: 'tutor',
      status: 'active',
      createdBy: 'integration-seed',
      rubricVersion: 'v1',
      allowsResume: true,
      targetDurationMinutes: 18,
    })

    const inviteId = await ctx.db.insert('candidateInvites', {
      orgId,
      inviteToken: args.inviteToken,
      templateId,
      status: 'opened',
      candidateName: participantName,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    if (!args.withLiveSession) {
      return { inviteId }
    }

    const roomName = `interview-${args.inviteToken}`
    const sessionId = await ctx.db.insert('interviewSessions', {
      orgId,
      inviteId,
      state: 'live',
      provider: 'livekit',
      roomName,
      participantName,
      reconnectCount: 0,
      activeDurationMs: 0,
      startedAt: new Date().toISOString(),
      lastLiveStartedAt: new Date().toISOString(),
    })

    return { inviteId, sessionId, roomName }
  },
})

export const getSessionSnapshot = internalQuery({
  args: {
    sessionId: v.id('interviewSessions'),
  },
  returns: v.union(
    v.object({
      state: v.string(),
      roomName: v.optional(v.string()),
      participantName: v.optional(v.string()),
      eventCount: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    if (!session) {
      return null
    }
    const events = await ctx.db
      .query('sessionEvents')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .take(50)
    return {
      state: session.state,
      roomName: session.roomName,
      participantName: session.participantName,
      eventCount: events.length,
    }
  },
})

export const getUserByClerkId = internalQuery({
  args: {
    clerkId: v.string(),
  },
  returns: v.union(
    v.object({
      clerkId: v.string(),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .first()
    if (!user) {
      return null
    }
    return {
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
    }
  },
})

export const seedProcessingSession = internalMutation({
  args: {
    inviteToken: v.string(),
    participantName: v.optional(v.string()),
  },
  returns: v.object({
    inviteId: v.id('candidateInvites'),
    sessionId: v.id('interviewSessions'),
    roomName: v.string(),
  }),
  handler: async (ctx, args) => {
    const orgId = 'org_integration'
    const participantName = args.participantName ?? 'Process Candidate'

    const templateId = await ctx.db.insert('assessmentTemplates', {
      orgId,
      name: 'Processing template',
      role: 'tutor',
      status: 'active',
      createdBy: 'integration-seed',
      rubricVersion: 'v1',
      allowsResume: true,
      targetDurationMinutes: 18,
    })

    const inviteId = await ctx.db.insert('candidateInvites', {
      orgId,
      inviteToken: args.inviteToken,
      templateId,
      status: 'in_progress',
      candidateName: participantName,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    const roomName = `interview-${args.inviteToken}`
    const sessionId = await ctx.db.insert('interviewSessions', {
      orgId,
      inviteId,
      state: 'processing',
      provider: 'livekit',
      roomName,
      participantName,
      reconnectCount: 0,
      activeDurationMs: 5_000,
      startedAt: new Date(Date.now() - 60_000).toISOString(),
      endedAt: new Date().toISOString(),
    })

    return { inviteId, sessionId, roomName }
  },
})
