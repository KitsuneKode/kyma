// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { internal } from './_generated/api'
import {
  CLERK_ORG_ID_SEED_TABLES,
  ORG_ID_SEED_TABLES,
  SEED_ORG_TABLES,
  assertDevSeedAllowed,
} from './devSeedTables'
import devSeedMutationsSource from './devSeedMutations.ts?raw'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

function harness() {
  return convexTest(schema, modules)
}

/**
 * These tests exercise the deployment opt-in together with the raw NODE_ENV
 * signal that is visible outside the Convex runtime.
 *
 * An earlier version of this suite passed raw object literals such as `{}`,
 * a shape the real call site can never produce because the default has already
 * been applied. It therefore passed against a guard that did NOT block
 * production. Any future test here must go through `convexEnv` or set
 * `process.env` directly.
 */
function envWith(deploymentEnv?: string) {
  return { KYMA_DEPLOYMENT_ENV: deploymentEnv }
}

describe('dev seed deployment guard', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', undefined as unknown as string)
    vi.stubEnv('KYMA_DEPLOYMENT_ENV', undefined as unknown as string)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('blocks a production deployment where neither variable was set', () => {
    // The exact trap: the validated shim applies a zod
    // `.default('development')`, so a guard reading it would wrongly allow a
    // deployment where the variable was never set.
    expect(process.env.NODE_ENV).toBeUndefined()
    expect(() => assertDevSeedAllowed(envWith(undefined))).toThrow(/blocked/i)
  })

  test('blocks when the deployment env says production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(() => assertDevSeedAllowed(envWith('production'))).toThrow(
      /blocked/i
    )
  })

  test('blocks under a production NODE_ENV', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(() => assertDevSeedAllowed(envWith('development'))).toThrow(
      /blocked/i
    )
  })

  test('blocks under a test NODE_ENV', () => {
    vi.stubEnv('NODE_ENV', 'test')
    expect(() => assertDevSeedAllowed(envWith('development'))).toThrow(
      /blocked/i
    )
  })

  test('blocks when only NODE_ENV says development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(() => assertDevSeedAllowed(envWith(undefined))).toThrow(/blocked/i)
  })

  test('allows the explicit opt-in when NODE_ENV is unset', () => {
    // Verified against a live Convex deployment: the Convex runtime pins the
    // raw NODE_ENV value to 'production' and ignores `convex env set NODE_ENV`,
    // so requiring a development NODE_ENV would make dev seeding impossible
    // there. KYMA_DEPLOYMENT_ENV is the operator-controlled opt-in.
    expect(() => assertDevSeedAllowed(envWith('development'))).not.toThrow()
  })

  test('allows when the opt-in and a development NODE_ENV agree', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(() => assertDevSeedAllowed(envWith('development'))).not.toThrow()
  })
})

describe('org-scoped dev reset', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('every supported table belongs to exactly one indexed group', () => {
    const orgIdTables = new Set<string>(ORG_ID_SEED_TABLES)
    const clerkOrgIdTables = new Set<string>(CLERK_ORG_ID_SEED_TABLES)

    expect(
      SEED_ORG_TABLES.filter(
        (table) =>
          Number(orgIdTables.has(table)) +
            Number(clerkOrgIdTables.has(table)) !==
          1
      )
    ).toEqual([])
    expect(
      new Set([...ORG_ID_SEED_TABLES, ...CLERK_ORG_ID_SEED_TABLES])
    ).toEqual(new Set(SEED_ORG_TABLES))
  })

  test('uses indexed reads rather than database filters', () => {
    expect(devSeedMutationsSource).not.toContain('.filter(')
  })

  test('deletes only rows belonging to the requested organization', async () => {
    vi.stubEnv('KYMA_DEPLOYMENT_ENV', 'development')
    vi.stubEnv('CONVEX_CLOUD_URL', 'https://test.convex.cloud')
    const t = harness()
    await t.run(async (ctx) => {
      await ctx.db.insert('workspaceSettings', {
        orgId: 'org_target',
        updatedAt: 1,
        updatedBy: 'test',
      })
      await ctx.db.insert('workspaceSettings', {
        orgId: 'org_other',
        updatedAt: 1,
        updatedBy: 'test',
      })
      await ctx.db.insert('organizations', {
        clerkOrgId: 'org_target',
        name: 'Target',
        slug: 'target',
        createdAt: 1,
        updatedAt: 1,
      })
      await ctx.db.insert('organizations', {
        clerkOrgId: 'org_other',
        name: 'Other',
        slug: 'other',
        createdAt: 1,
        updatedAt: 1,
      })
    })

    await t.mutation(internal.devSeedMutations.clearOrgTableChunk, {
      table: 'workspaceSettings',
      orgId: 'org_target',
    })
    await t.mutation(internal.devSeedMutations.clearOrgTableChunk, {
      table: 'organizations',
      orgId: 'org_target',
    })

    const remaining = await t.run(async (ctx) => ({
      settings: await ctx.db.query('workspaceSettings').take(10),
      organizations: await ctx.db.query('organizations').take(10),
    }))
    expect(remaining.settings.map((row) => row.orgId)).toEqual(['org_other'])
    expect(remaining.organizations.map((row) => row.clerkOrgId)).toEqual([
      'org_other',
    ])
  })
})
