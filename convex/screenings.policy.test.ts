// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { beforeEach, describe, expect, test } from 'vitest'

import { api } from './_generated/api'
import schema from './schema'
import { DEFAULT_INTERVIEW_DURATION_MINUTES } from './helpers/interviewPolicy'

const modules = import.meta.glob('./**/*.ts')

const RECRUITER_IDENTITY = {
  subject: 'user_recruiter_policy',
  org_id: 'org_policy_test',
  org_role: 'org:admin',
}

function harness() {
  return convexTest(schema, modules)
}

describe('createScreeningBatch policy persistence', () => {
  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = 'sk_test'
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test'
    process.env.CLERK_JWT_ISSUER_DOMAIN = 'https://clerk.test'
  })

  test('inherits template duration and resume when omitted', async () => {
    const t = harness()
    const asRecruiter = t.withIdentity(RECRUITER_IDENTITY)

    const templateId = await t.run(async (ctx) =>
      ctx.db.insert('assessmentTemplates', {
        orgId: RECRUITER_IDENTITY.org_id as string,
        name: 'SWE template',
        role: 'engineer',
        status: 'active',
        createdBy: 'seed',
        rubricVersion: 'v1',
        jobFamily: 'software_engineering',
        targetDurationMinutes: 25,
        allowsResume: false,
      })
    )

    const batchId = await asRecruiter.mutation(
      api.recruiter.screenings.createScreeningBatch,
      {
        name: 'Inherited policy batch',
        allowedAttempts: 1,
        templateId,
        candidates: [
          {
            candidateName: 'Alex',
            candidateEmail: 'alex@example.com',
          },
        ],
      }
    )

    const batch = await t.run((ctx) => ctx.db.get(batchId))
    expect(batch?.targetDurationMinutes).toBe(25)
    expect(batch?.allowsResume).toBe(false)
  })

  test('persists explicit duration and resume overrides', async () => {
    const t = harness()
    const asRecruiter = t.withIdentity(RECRUITER_IDENTITY)

    const templateId = await t.run(async (ctx) =>
      ctx.db.insert('assessmentTemplates', {
        orgId: RECRUITER_IDENTITY.org_id as string,
        name: 'Template defaults',
        role: 'engineer',
        status: 'active',
        createdBy: 'seed',
        rubricVersion: 'v1',
        targetDurationMinutes: 20,
        allowsResume: true,
      })
    )

    const batchId = await asRecruiter.mutation(
      api.recruiter.screenings.createScreeningBatch,
      {
        name: 'Override policy batch',
        allowedAttempts: 2,
        templateId,
        targetDurationMinutes: 30,
        allowsResume: false,
        candidates: [
          {
            candidateName: 'Jamie',
            candidateEmail: 'jamie@example.com',
          },
        ],
      }
    )

    const batch = await t.run((ctx) => ctx.db.get(batchId))
    expect(batch?.targetDurationMinutes).toBe(30)
    expect(batch?.allowsResume).toBe(false)
    expect(batch?.targetDurationMinutes).not.toBe(
      DEFAULT_INTERVIEW_DURATION_MINUTES
    )
  })
})
