// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { beforeEach, describe, expect, test } from 'vitest'

import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

const CANDIDATE_A = {
  subject: 'user_candidate_a',
  email: 'alice@example.com',
  name: 'Alice Candidate',
}

const CANDIDATE_B = {
  subject: 'user_candidate_b',
  email: 'bob@example.com',
  name: 'Bob Candidate',
}

function harness() {
  return convexTest(schema, modules)
}

async function seedUser(
  t: ReturnType<typeof harness>,
  identity: typeof CANDIDATE_A
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      clerkId: identity.subject,
      email: identity.email,
      name: identity.name,
      role: 'candidate',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  })
}

async function seedScreeningInvite(
  t: ReturnType<typeof harness>,
  options: {
    inviteToken: string
    candidateEmail?: string
    userId?: Id<'users'>
    sessionPurpose?: 'screening' | 'mock' | 'demo'
  }
) {
  return await t.run(async (ctx) => {
    const templateId = await ctx.db.insert('assessmentTemplates', {
      orgId: 'org_claim_test',
      name: 'Claim test template',
      role: 'engineer',
      status: 'active',
      createdBy: 'seed',
      rubricVersion: 'v1',
    })

    const inviteId = await ctx.db.insert('candidateInvites', {
      orgId: 'org_claim_test',
      inviteToken: options.inviteToken,
      candidateName: 'Invitee',
      candidateEmail: options.candidateEmail,
      userId: options.userId,
      templateId,
      sessionPurpose: options.sessionPurpose ?? 'screening',
      status: 'created',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const sessionId = await ctx.db.insert('interviewSessions', {
      orgId: 'org_claim_test',
      inviteId,
      candidateUserId: options.userId,
      sessionPurpose: options.sessionPurpose ?? 'screening',
      state: 'ready',
      provider: 'livekit',
    })

    return { inviteId, sessionId, templateId }
  })
}

describe('claimCandidateInviteByToken (main API)', () => {
  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = 'sk_test'
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test'
    process.env.CLERK_JWT_ISSUER_DOMAIN = 'https://clerk.test'
  })

  test('links unclaimed invite when email matches', async () => {
    const t = harness()
    const userId = await seedUser(t, CANDIDATE_A)
    const { inviteId, sessionId } = await seedScreeningInvite(t, {
      inviteToken: 'claim-ok-token',
      candidateEmail: CANDIDATE_A.email,
    })
    const asCandidate = t.withIdentity(CANDIDATE_A)

    const result = await asCandidate.mutation(
      api.interviews.candidatePortal.claimCandidateInviteByToken,
      { inviteToken: 'claim-ok-token' }
    )

    expect(result).toEqual({ linked: true })

    const invite = await t.run((ctx) => ctx.db.get(inviteId))
    const session = await t.run((ctx) => ctx.db.get(sessionId))
    expect(invite?.userId).toBe(userId)
    expect(session?.candidateUserId).toBe(userId)
  })

  test('rejects claim when account email does not match invite email', async () => {
    const t = harness()
    await seedUser(t, CANDIDATE_B)
    await seedScreeningInvite(t, {
      inviteToken: 'claim-email-mismatch',
      candidateEmail: 'alice@example.com',
    })
    const asBob = t.withIdentity(CANDIDATE_B)

    await expect(
      asBob.mutation(
        api.interviews.candidatePortal.claimCandidateInviteByToken,
        {
          inviteToken: 'claim-email-mismatch',
        }
      )
    ).rejects.toThrow(/does not match/i)
  })

  test('returns linked false for unknown invite token', async () => {
    const t = harness()
    await seedUser(t, CANDIDATE_A)
    const asAlice = t.withIdentity(CANDIDATE_A)

    const result = await asAlice.mutation(
      api.interviews.candidatePortal.claimCandidateInviteByToken,
      { inviteToken: 'missing-token' }
    )

    expect(result).toEqual({ linked: false })
  })

  test('requires signed-in identity with email', async () => {
    const t = harness()
    await seedScreeningInvite(t, {
      inviteToken: 'claim-unauth',
      candidateEmail: CANDIDATE_A.email,
    })

    await expect(
      t.mutation(api.interviews.candidatePortal.claimCandidateInviteByToken, {
        inviteToken: 'claim-unauth',
      })
    ).rejects.toThrow(/sign in/i)
  })

  /**
   * Documents current main behavior: claim overwrites `userId` when the
   * caller's email matches (or invite has no email). Ownership hijack
   * rejection lands on the harden-invite-tokens branch — not asserted here.
   */
  test('idempotent claim when already linked to same user', async () => {
    const t = harness()
    const userId = await seedUser(t, CANDIDATE_A)
    await seedScreeningInvite(t, {
      inviteToken: 'claim-idempotent',
      candidateEmail: CANDIDATE_A.email,
      userId,
    })
    const asAlice = t.withIdentity(CANDIDATE_A)

    const result = await asAlice.mutation(
      api.interviews.candidatePortal.claimCandidateInviteByToken,
      { inviteToken: 'claim-idempotent' }
    )

    expect(result).toEqual({ linked: true })

    const invite = await t.run(async (ctx) => {
      return await ctx.db
        .query('candidateInvites')
        .withIndex('by_invite_token', (q) =>
          q.eq('inviteToken', 'claim-idempotent')
        )
        .first()
    })
    expect(invite?.userId).toBe(userId)
  })
})
