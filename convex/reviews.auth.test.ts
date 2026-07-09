// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { beforeEach, describe, expect, test } from 'vitest'

import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

const ORG_ID = 'org_review_auth'

const RECRUITER_WITH_READ = {
  subject: 'user_recruiter_read',
  org_id: ORG_ID,
  org_role: 'org:member',
  // Both capabilities are required: candidates:read for the review gate,
  // recruiter:access for requireOrgId ownership scoping.
  org_permissions: ['org:recruiter:access', 'org:recruiter:candidates:read'],
}

const RECRUITER_WITHOUT_READ = {
  subject: 'user_recruiter_no_read',
  org_id: ORG_ID,
  org_role: 'org:member',
  org_permissions: ['org:recruiter:access'],
}

const OTHER_ORG_RECRUITER = {
  subject: 'user_other_org',
  org_id: 'org_other',
  org_role: 'org:admin',
  org_permissions: ['org:recruiter:candidates:read'],
}

const CANDIDATE = {
  subject: 'user_candidate_review',
  email: 'candidate@example.com',
  name: 'Candidate',
}

function harness() {
  return convexTest(schema, modules)
}

async function seedReviewSession(t: ReturnType<typeof harness>) {
  return await t.run(async (ctx) => {
    const templateId = await ctx.db.insert('assessmentTemplates', {
      orgId: ORG_ID,
      name: 'Review auth template',
      role: 'engineer',
      status: 'active',
      createdBy: 'seed',
      rubricVersion: 'v1',
    })

    const inviteId = await ctx.db.insert('candidateInvites', {
      orgId: ORG_ID,
      inviteToken: 'review-auth-invite',
      candidateName: 'Alex Candidate',
      candidateEmail: 'alex@example.com',
      templateId,
      sessionPurpose: 'screening',
      status: 'completed',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const sessionId: Id<'interviewSessions'> = await ctx.db.insert(
      'interviewSessions',
      {
        orgId: ORG_ID,
        inviteId,
        sessionPurpose: 'screening',
        state: 'completed',
        provider: 'livekit',
        participantName: 'Alex Candidate',
      }
    )

    return { sessionId }
  })
}

describe('getCandidateReviewDetail auth matrix', () => {
  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = 'sk_test'
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test'
    process.env.CLERK_JWT_ISSUER_DOMAIN = 'https://clerk.test'
    delete process.env.KYMA_PROCESSING_WRITE_KEY
  })

  test('rejects unauthenticated callers', async () => {
    const t = harness()
    const { sessionId } = await seedReviewSession(t)

    await expect(
      t.query(api.recruiter.reviews.getCandidateReviewDetail, { sessionId })
    ).rejects.toThrow(/signed in|authorized/i)
  })

  test('rejects candidate identity without recruiter capability', async () => {
    const t = harness()
    const { sessionId } = await seedReviewSession(t)
    const asCandidate = t.withIdentity(CANDIDATE)

    await expect(
      asCandidate.query(api.recruiter.reviews.getCandidateReviewDetail, {
        sessionId,
      })
    ).rejects.toThrow(/authorized|organization/i)
  })

  test('rejects recruiter missing candidates:read permission', async () => {
    const t = harness()
    const { sessionId } = await seedReviewSession(t)
    const asRecruiter = t.withIdentity(RECRUITER_WITHOUT_READ)

    await expect(
      asRecruiter.query(api.recruiter.reviews.getCandidateReviewDetail, {
        sessionId,
      })
    ).rejects.toThrow(/authorized/i)
  })

  test('allows recruiter with candidates:read for same org', async () => {
    const t = harness()
    const { sessionId } = await seedReviewSession(t)
    const asRecruiter = t.withIdentity(RECRUITER_WITH_READ)

    const detail = await asRecruiter.query(
      api.recruiter.reviews.getCandidateReviewDetail,
      { sessionId }
    )

    expect(detail).not.toBeNull()
    expect(detail?.session.id).toBe(sessionId)
    expect(detail?.candidate.name).toBe('Alex Candidate')
  })

  test('returns null for recruiter in a different org (ownership guard)', async () => {
    const t = harness()
    const { sessionId } = await seedReviewSession(t)
    const asOtherOrg = t.withIdentity(OTHER_ORG_RECRUITER)

    const detail = await asOtherOrg.query(
      api.recruiter.reviews.getCandidateReviewDetail,
      { sessionId }
    )

    expect(detail).toBeNull()
  })
})
