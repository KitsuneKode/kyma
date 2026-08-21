// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { afterEach, beforeEach, describe, expect, test } from 'vitest'

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
const originalNodeEnv = process.env.NODE_ENV
const originalDeploymentEnv = process.env.KYMA_DEPLOYMENT_ENV

function envWith(deploymentEnv?: string) {
  return { ...convexEnv, KYMA_DEPLOYMENT_ENV: deploymentEnv }
}

describe('dev seed deployment guard', () => {
  beforeEach(() => {
    delete process.env.NODE_ENV
    delete process.env.KYMA_DEPLOYMENT_ENV
  })

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    if (originalDeploymentEnv === undefined)
      delete process.env.KYMA_DEPLOYMENT_ENV
    else process.env.KYMA_DEPLOYMENT_ENV = originalDeploymentEnv
  })

  test('blocks a production deployment where neither variable was set', () => {
    // The exact trap: the validated shim applies a zod
    // `.default('development')`, so a guard reading it would wrongly allow a
    // deployment where the variable was never set.
    expect(process.env.NODE_ENV).toBeUndefined()
    expect(() => assertDevSeedAllowed(envWith(undefined))).toThrow(/blocked/i)
  })

  test('blocks when the deployment env says production', () => {
    process.env.NODE_ENV = 'development'
    expect(() => assertDevSeedAllowed(envWith('production'))).toThrow(
      /blocked/i
    )
  })

  test('blocks under a production NODE_ENV', () => {
    process.env.NODE_ENV = 'production'
    expect(() => assertDevSeedAllowed(envWith('development'))).toThrow(
      /blocked/i
    )
  })

  test('blocks under a test NODE_ENV', () => {
    process.env.NODE_ENV = 'test'
    expect(() => assertDevSeedAllowed(envWith('development'))).toThrow(
      /blocked/i
    )
  })

  test('blocks when only NODE_ENV says development', () => {
    process.env.NODE_ENV = 'development'
    expect(() => assertDevSeedAllowed(envWith(undefined))).toThrow(/blocked/i)
  })

  test('blocks when only the deployment env says development', () => {
    expect(() => assertDevSeedAllowed(envWith('development'))).toThrow(
      /blocked/i
    )
  })

  test('allows only when BOTH signals explicitly say development', () => {
    process.env.NODE_ENV = 'development'
    expect(() => assertDevSeedAllowed(envWith('development'))).not.toThrow()
  })
})
