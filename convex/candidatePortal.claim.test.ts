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

describe('claimCandidateInviteByToken hardening', () => {
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

  test('rejects claim when invite is owned by a different user', async () => {
    const t = harness()
    const ownerId = await seedUser(t, CANDIDATE_A)
    await seedUser(t, CANDIDATE_B)
    await seedScreeningInvite(t, {
      inviteToken: 'claim-hijack-token',
      candidateEmail: CANDIDATE_B.email,
      userId: ownerId,
    })
    const asBob = t.withIdentity(CANDIDATE_B)

    await expect(
      asBob.mutation(
        api.interviews.candidatePortal.claimCandidateInviteByToken,
        {
          inviteToken: 'claim-hijack-token',
        }
      )
    ).rejects.toThrow(/already linked to another account/i)

    const invite = await t.run(async (ctx) => {
      return await ctx.db
        .query('candidateInvites')
        .withIndex('by_invite_token', (q) =>
          q.eq('inviteToken', 'claim-hijack-token')
        )
        .first()
    })
    expect(invite?.userId).toBe(ownerId)
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

  test('rejects screening claim when invite has no candidateEmail', async () => {
    const t = harness()
    await seedUser(t, CANDIDATE_A)
    await seedScreeningInvite(t, {
      inviteToken: 'claim-no-email',
    })
    const asAlice = t.withIdentity(CANDIDATE_A)

    await expect(
      asAlice.mutation(
        api.interviews.candidatePortal.claimCandidateInviteByToken,
        { inviteToken: 'claim-no-email' }
      )
    ).rejects.toThrow(/missing a candidate email/i)
  })

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
  })
})

describe('linkCandidateInviteByEmail hardening', () => {
  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = 'sk_test'
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test'
    process.env.CLERK_JWT_ISSUER_DOMAIN = 'https://clerk.test'
  })

  test('links unmatched invites by email and skips other owners', async () => {
    const t = harness()
    const ownerId = await seedUser(t, CANDIDATE_A)
    const bobId = await seedUser(t, {
      ...CANDIDATE_B,
      // Bob signs in with Alice's email to attempt hijack via email linker
      email: CANDIDATE_A.email,
      subject: 'user_candidate_b_same_email',
    })

    const { inviteId: freeInviteId } = await seedScreeningInvite(t, {
      inviteToken: 'email-link-free',
      candidateEmail: CANDIDATE_A.email,
    })
    const { inviteId: ownedInviteId } = await seedScreeningInvite(t, {
      inviteToken: 'email-link-owned',
      candidateEmail: CANDIDATE_A.email,
      userId: ownerId,
    })

    // Authenticate as Bob who has the same email string in identity
    const asBob = t.withIdentity({
      subject: 'user_candidate_b_same_email',
      email: CANDIDATE_A.email,
      name: 'Bob Hijacker',
    })

    const result = await asBob.mutation(
      api.interviews.candidatePortal.linkCandidateInviteByEmail,
      {}
    )

    expect(result?.linkedInvites).toBe(1)

    const freeInvite = await t.run((ctx) => ctx.db.get(freeInviteId))
    const ownedInvite = await t.run((ctx) => ctx.db.get(ownedInviteId))
    expect(freeInvite?.userId).toBe(bobId)
    expect(ownedInvite?.userId).toBe(ownerId)
  })
})
