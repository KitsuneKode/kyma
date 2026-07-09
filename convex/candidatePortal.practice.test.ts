// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { beforeEach, describe, expect, test } from 'vitest'

import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'
import { SYSTEM_ORG_ID } from '../lib/interview/session-purpose'
import { PRACTICE_SESSION_LIMIT } from '../lib/practice/packs'

const modules = import.meta.glob('./**/*.ts')

const CANDIDATE_IDENTITY = {
  subject: 'user_candidate_practice',
  email: 'candidate@example.com',
  name: 'Practice Candidate',
}

function harness() {
  return convexTest(schema, modules)
}

async function seedCandidateUser(t: ReturnType<typeof harness>) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert('users', {
      clerkId: CANDIDATE_IDENTITY.subject,
      email: CANDIDATE_IDENTITY.email,
      name: CANDIDATE_IDENTITY.name,
      role: 'candidate',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  })
}

async function seedPracticeInvite(
  t: ReturnType<typeof harness>,
  userId: Id<'users'>,
  options: {
    createdAt: number
    status: 'created' | 'opened' | 'in_progress' | 'completed' | 'expired'
    jobFamily?: string
    sessionState?: string
  }
) {
  return await t.run(async (ctx) => {
    const templateId = await ctx.db.insert('assessmentTemplates', {
      orgId: SYSTEM_ORG_ID,
      name: 'Practice SWE',
      role: 'engineer',
      status: 'active',
      createdBy: 'seed',
      rubricVersion: 'v1',
      jobFamily: 'software_engineering',
    })

    const inviteToken = `mock-software_engineering-${userId}-${options.createdAt.toString(36)}`
    const inviteId = await ctx.db.insert('candidateInvites', {
      orgId: SYSTEM_ORG_ID,
      inviteToken,
      sessionPurpose: 'mock',
      practiceJobFamily: options.jobFamily as
        | 'software_engineering'
        | undefined,
      practiceCreatedAt: options.createdAt,
      candidateName: 'Practice Candidate',
      candidateEmail: CANDIDATE_IDENTITY.email,
      userId,
      templateId,
      status: options.status,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    const sessionId = await ctx.db.insert('interviewSessions', {
      orgId: SYSTEM_ORG_ID,
      inviteId,
      candidateUserId: userId,
      sessionPurpose: 'mock',
      state: (options.sessionState ?? 'completed') as 'completed',
      provider: 'livekit',
    })

    return { inviteId, sessionId, inviteToken, templateId }
  })
}

async function seedScreeningSession(
  t: ReturnType<typeof harness>,
  userId: Id<'users'>
) {
  return await t.run(async (ctx) => {
    const templateId = await ctx.db.insert('assessmentTemplates', {
      orgId: 'org_employer',
      name: 'Employer screening',
      role: 'engineer',
      status: 'active',
      createdBy: 'seed',
      rubricVersion: 'v1',
    })

    const inviteId = await ctx.db.insert('candidateInvites', {
      orgId: 'org_employer',
      inviteToken: 'screening-invite-1',
      sessionPurpose: 'screening',
      templateId,
      status: 'completed',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      userId,
    })

    const sessionId = await ctx.db.insert('interviewSessions', {
      orgId: 'org_employer',
      inviteId,
      candidateUserId: userId,
      sessionPurpose: 'screening',
      state: 'completed',
      provider: 'livekit',
    })

    return { sessionId }
  })
}

describe('candidatePortal practice flows', () => {
  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = 'sk_test'
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test'
    process.env.CLERK_JWT_ISSUER_DOMAIN = 'https://clerk.test'
  })

  test('rate limit excludes created invites that were never opened', async () => {
    const t = harness()
    const userId = await seedCandidateUser(t)
    const asCandidate = t.withIdentity(CANDIDATE_IDENTITY)
    const now = Date.now()

    for (let index = 0; index < PRACTICE_SESSION_LIMIT; index += 1) {
      await seedPracticeInvite(t, userId, {
        createdAt: now - index * 1000,
        status: 'created',
      })
    }

    const usage = await asCandidate.query(
      api.interviews.candidatePortal.getPracticeUsage,
      { nowMs: now }
    )
    expect(usage.sessionsUsed).toBe(0)
  })

  test('rate limit counts opened practice invites in the rolling window', async () => {
    const t = harness()
    const userId = await seedCandidateUser(t)
    const asCandidate = t.withIdentity(CANDIDATE_IDENTITY)
    const now = Date.now()

    for (let index = 0; index < PRACTICE_SESSION_LIMIT; index += 1) {
      await seedPracticeInvite(t, userId, {
        createdAt: now - index * 1000,
        status: 'opened',
      })
    }

    const usage = await asCandidate.query(
      api.interviews.candidatePortal.getPracticeUsage,
      { nowMs: now }
    )
    expect(usage.sessionsUsed).toBe(PRACTICE_SESSION_LIMIT)
  })

  test('listCandidateInterviews filters by purpose', async () => {
    const t = harness()
    const userId = await seedCandidateUser(t)
    const asCandidate = t.withIdentity(CANDIDATE_IDENTITY)
    const now = Date.now()

    const practice = await seedPracticeInvite(t, userId, {
      createdAt: now,
      status: 'completed',
    })
    const screening = await seedScreeningSession(t, userId)

    const screeningOnly = await asCandidate.query(
      api.interviews.candidatePortal.listCandidateInterviews,
      { purpose: 'screening' }
    )
    expect(
      screeningOnly.map(
        (item: { sessionId: Id<'interviewSessions'> }) => item.sessionId
      )
    ).toEqual([screening.sessionId])

    const practiceOnly = await asCandidate.query(
      api.interviews.candidatePortal.listCandidateInterviews,
      { purpose: 'practice' }
    )
    expect(
      practiceOnly.map(
        (item: { sessionId: Id<'interviewSessions'> }) => item.sessionId
      )
    ).toEqual([practice.sessionId])
    expect(practiceOnly[0]?.sessionPurpose).toBe('mock')
  })

  test('getPracticeSessionSummary resolves practiceJobFamily from invite field', async () => {
    const t = harness()
    const userId = await seedCandidateUser(t)
    const asCandidate = t.withIdentity(CANDIDATE_IDENTITY)

    const { sessionId } = await seedPracticeInvite(t, userId, {
      createdAt: Date.now(),
      status: 'completed',
      jobFamily: 'software_engineering',
    })

    const summary = await asCandidate.query(
      api.interviews.candidatePortal.getPracticeSessionSummary,
      { sessionId }
    )

    expect(summary?.jobFamily).toBe('software_engineering')
    expect(summary?.tips.join(' ')).not.toMatch(/\b(hire|reject)\b/i)
  })
})
