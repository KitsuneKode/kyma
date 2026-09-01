// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { beforeEach, describe, expect, test } from 'vitest'

import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

const ORG_ID = 'org_sampling'

const RECRUITER = {
  subject: 'user_sampling_recruiter',
  org_id: ORG_ID,
  org_role: 'org:admin',
  org_permissions: ['org:recruiter:access', 'org:recruiter:screenings:write'],
}

function harness() {
  return convexTest(schema, modules)
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * Seeds `oldCount` batches well outside the 30-day quota window plus
 * `recentCount` inside it. The old batches are inserted first so they occupy
 * the ascending-order prefix that the pre-fix `.take(100)` sampled.
 */
async function seedBatches(
  t: ReturnType<typeof harness>,
  { oldCount, recentCount }: { oldCount: number; recentCount: number }
) {
  return await t.run(async (ctx) => {
    const templateId = await ctx.db.insert('assessmentTemplates', {
      orgId: ORG_ID,
      name: 'Sampling template',
      role: 'engineer',
      status: 'active',
      createdBy: 'seed',
      rubricVersion: 'v1',
    })

    for (let index = 0; index < oldCount; index += 1) {
      await ctx.db.insert('screeningBatches', {
        orgId: ORG_ID,
        name: `Old batch ${index}`,
        templateId,
        createdBy: 'seed',
        status: 'active',
        allowedAttempts: 1,
        createdAt: isoDaysAgo(200 - index / 1000),
      })
    }

    const recentIds: Id<'screeningBatches'>[] = []
    for (let index = 0; index < recentCount; index += 1) {
      recentIds.push(
        await ctx.db.insert('screeningBatches', {
          orgId: ORG_ID,
          name: `Recent batch ${index}`,
          templateId,
          createdBy: 'seed',
          status: 'active',
          allowedAttempts: 1,
          createdAt: isoDaysAgo(1 - index / 1000),
        })
      )
    }

    return { templateId, recentIds }
  })
}

describe('screening sampling order', () => {
  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = 'sk_test'
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test'
    process.env.CLERK_JWT_ISSUER_DOMAIN = 'https://clerk.test'
  })

  test('the 30-day quota counts recent batches, not the oldest sample', async () => {
    const t = harness()
    // Free plan allows 5 batches per 30 days; seed 110 old + 6 recent so the
    // oldest-100 sample would report zero recent batches and let the quota pass.
    const { templateId } = await seedBatches(t, {
      oldCount: 110,
      recentCount: 6,
    })
    const asRecruiter = t.withIdentity(RECRUITER)

    await expect(
      asRecruiter.mutation(api.recruiter.screenings.createScreeningBatch, {
        name: 'Should be rejected by quota',
        allowedAttempts: 1,
        templateId,
        candidates: [
          { candidateName: 'Quota Probe', candidateEmail: 'probe@example.com' },
        ],
      })
    ).rejects.toThrow(/screening batches per 30 days/i)
  })

  test('the screenings list surfaces the newest batches', async () => {
    const t = harness()
    await seedBatches(t, { oldCount: 110, recentCount: 5 })
    const asRecruiter = t.withIdentity(RECRUITER)

    const batches = await asRecruiter.query(
      api.recruiter.screenings.listScreeningBatches,
      { nowMs: Date.now() }
    )

    expect(batches.length).toBeGreaterThan(0)
    expect(batches[0]?.name).toMatch(/^Recent batch/)
  })

  test('rejects batches beyond the supported operational maximum', async () => {
    const t = harness()
    const { templateId } = await seedBatches(t, {
      oldCount: 0,
      recentCount: 0,
    })
    const asRecruiter = t.withIdentity(RECRUITER)

    await expect(
      asRecruiter.mutation(api.recruiter.screenings.createScreeningBatch, {
        name: 'Oversized batch',
        allowedAttempts: 1,
        templateId,
        candidates: Array.from({ length: 501 }, (_, index) => ({
          candidateName: `Candidate ${index}`,
          candidateEmail: `candidate-${index}@example.com`,
        })),
      })
    ).rejects.toThrow(/supported maximum of 500 candidates/i)
  })
})
