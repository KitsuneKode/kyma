// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { assertDevSeedAllowed } from './devSeed'
import { convexEnv } from '../lib/env/convex'

/**
 * These tests exercise the guard the way production calls it — through
 * `convexEnv`, whose `NODE_ENV` carries a zod `.default('development')`.
 *
 * An earlier version of this suite passed raw object literals such as `{}`,
 * a shape the real call site can never produce because the default has already
 * been applied. It therefore passed against a guard that did NOT block
 * production. Any future test here must go through `convexEnv` or set
 * `process.env` directly.
 */
function envWith(deploymentEnv?: string) {
  return { ...convexEnv, KYMA_DEPLOYMENT_ENV: deploymentEnv }
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

  test('blocks when only the deployment env says development', () => {
    expect(() => assertDevSeedAllowed(envWith('development'))).toThrow(
      /blocked/i
    )
  })

  test('allows only when BOTH signals explicitly say development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(() => assertDevSeedAllowed(envWith('development'))).not.toThrow()
  })
})
