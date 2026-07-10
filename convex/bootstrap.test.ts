// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { ConvexError } from 'convex/values'
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'

import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

function harness() {
  return convexTest(schema, modules)
}

async function seedInviteChain(
  t: ReturnType<typeof harness>,
  options: {
    allowsResume?: boolean
    inviteToken?: string
    participantName?: string
    sessionState?: 'connecting' | 'live' | 'interrupted'
    roomName?: string
  } = {}
) {
  const inviteToken = options.inviteToken ?? 'bootstrap-invite-token'
  const participantName = options.participantName ?? 'Alex Candidate'

  return await t.run(async (ctx) => {
    const orgId = 'org_bootstrap'
    const templateId = await ctx.db.insert('assessmentTemplates', {
      orgId,
      name: 'Bootstrap template',
      role: 'engineer',
      status: 'active',
      createdBy: 'seed',
      rubricVersion: 'v1',
      allowsResume: options.allowsResume ?? true,
      targetDurationMinutes: 20,
    })

    const batchId = await ctx.db.insert('screeningBatches', {
      orgId,
      name: 'Bootstrap batch',
      templateId,
      createdBy: 'seed',
      status: 'active',
      allowedAttempts: 1,
      allowsResume: options.allowsResume ?? true,
      targetDurationMinutes: 20,
      createdAt: new Date().toISOString(),
    })

    const inviteId = await ctx.db.insert('candidateInvites', {
      orgId,
      inviteToken,
      templateId,
      batchId,
      status: 'opened',
      candidateName: participantName,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    let sessionId: Id<'interviewSessions'> | undefined
    if (options.sessionState) {
      sessionId = await ctx.db.insert('interviewSessions', {
        orgId,
        inviteId,
        state: options.sessionState,
        provider: 'livekit',
        roomName: options.roomName ?? 'interview-room-original',
        participantName,
        reconnectCount: 1,
        activeDurationMs: 120_000,
      })
    }

    return { inviteToken, participantName, sessionId, inviteId, batchId }
  })
}

describe('bootstrapPublicSession', () => {
  test('creates a new session for a fresh invite', async () => {
    const t = harness()
    const { inviteToken, participantName } = await seedInviteChain(t)

    const result = await t.mutation(
      api.interviews.bootstrap.bootstrapPublicSession,
      { inviteToken, participantName }
    )

    expect(result.roomName).toMatch(/^interview-bootstrap-invite-token-/)
    expect(result.targetDurationMinutes).toBe(20)

    const session = await t.run((ctx) =>
      ctx.db.get('interviewSessions', result.sessionId)
    )
    expect(session?.state).toBe('connecting')
    expect(session?.participantName).toBe(participantName)
    expect(session?.reconnectCount).toBe(0)
  })

  test('rejects participant name mismatch on an existing session', async () => {
    const t = harness()
    const { inviteToken } = await seedInviteChain(t, {
      sessionState: 'live',
      participantName: 'Alex Candidate',
    })

    await expect(
      t.mutation(api.interviews.bootstrap.bootstrapPublicSession, {
        inviteToken,
        participantName: 'Someone Else',
      })
    ).rejects.toThrow(ConvexError)
  })

  test('rejects resume when policy disallows it', async () => {
    const t = harness()
    const { inviteToken, participantName } = await seedInviteChain(t, {
      allowsResume: false,
      sessionState: 'interrupted',
    })

    await expect(
      t.mutation(api.interviews.bootstrap.bootstrapPublicSession, {
        inviteToken,
        participantName,
      })
    ).rejects.toThrow(/does not allow session resume/i)
  })

  test('reopens interrupted sessions with a new room and increments reconnect count', async () => {
    const t = harness()
    const { inviteToken, participantName, sessionId } = await seedInviteChain(
      t,
      {
        allowsResume: true,
        sessionState: 'interrupted',
        roomName: 'interview-room-original',
      }
    )

    const result = await t.mutation(
      api.interviews.bootstrap.bootstrapPublicSession,
      { inviteToken, participantName }
    )

    expect(result.sessionId).toBe(sessionId)
    expect(result.roomName).not.toBe('interview-room-original')
    expect(result.roomName).toMatch(/^interview-bootstrap-invite-token-/)

    const session = await t.run((ctx) => ctx.db.get(sessionId!))
    expect(session?.state).toBe('connecting')
    expect(session?.reconnectCount).toBe(2)
    expect(session?.endedAt).toBeUndefined()
  })
})
