// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { describe, expect, test } from 'vitest'

import { assertDevSeedAllowed } from './devSeed'

describe('dev seed deployment guard', () => {
  test('blocks when NODE_ENV is unset (the production default trap)', () => {
    expect(() => assertDevSeedAllowed({})).toThrow(/blocked/i)
  })

  test('blocks when the deployment env says production', () => {
    expect(() =>
      assertDevSeedAllowed({
        KYMA_DEPLOYMENT_ENV: 'production',
        NODE_ENV: 'development',
      })
    ).toThrow(/blocked/i)
  })

  test('blocks under test NODE_ENV', () => {
    expect(() => assertDevSeedAllowed({ NODE_ENV: 'test' })).toThrow(/blocked/i)
  })

  test('blocks under production NODE_ENV', () => {
    expect(() => assertDevSeedAllowed({ NODE_ENV: 'production' })).toThrow(
      /blocked/i
    )
  })

  test('allows only an explicit development NODE_ENV', () => {
    expect(() =>
      assertDevSeedAllowed({ NODE_ENV: 'development' })
    ).not.toThrow()
  })

  test('allows an explicit development deployment env', () => {
    expect(() =>
      assertDevSeedAllowed({
        KYMA_DEPLOYMENT_ENV: 'development',
        NODE_ENV: 'development',
      })
    ).not.toThrow()
  })
})
