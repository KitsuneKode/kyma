import { describe, expect, test } from 'vitest'

import {
  allowsLocalProcessingKeyFallback,
  hasTrustedProcessingKeyForEnv,
} from './processingAuth'

describe('processingAuth', () => {
  test('never trusts empty keys when production NODE_ENV and key is missing', () => {
    const env = { NODE_ENV: 'production' }
    expect(allowsLocalProcessingKeyFallback(env)).toBe(false)
    expect(hasTrustedProcessingKeyForEnv(env, undefined)).toBe(false)
    expect(hasTrustedProcessingKeyForEnv(env, '')).toBe(false)
    expect(hasTrustedProcessingKeyForEnv(env, '__dev_preview__')).toBe(false)
  })

  test('never trusts empty keys when KYMA_DEPLOYMENT_ENV is production', () => {
    const env = {
      NODE_ENV: 'development',
      KYMA_DEPLOYMENT_ENV: 'production',
    }
    expect(allowsLocalProcessingKeyFallback(env)).toBe(false)
    expect(hasTrustedProcessingKeyForEnv(env, '')).toBe(false)
    expect(hasTrustedProcessingKeyForEnv(env, '__dev_preview__')).toBe(false)
  })

  test('allows local empty-key fallback only in clear development', () => {
    const env = { NODE_ENV: 'development' }
    expect(allowsLocalProcessingKeyFallback(env)).toBe(true)
    expect(hasTrustedProcessingKeyForEnv(env, undefined)).toBe(true)
    expect(hasTrustedProcessingKeyForEnv(env, '')).toBe(true)
    expect(hasTrustedProcessingKeyForEnv(env, '__dev_preview__')).toBe(true)
    expect(hasTrustedProcessingKeyForEnv(env, 'other')).toBe(false)
  })

  test('does not allow empty-key fallback in test NODE_ENV without a key', () => {
    const env = { NODE_ENV: 'test' }
    expect(allowsLocalProcessingKeyFallback(env)).toBe(false)
    expect(hasTrustedProcessingKeyForEnv(env, '')).toBe(false)
  })

  test('matches configured key when present', () => {
    const env = {
      NODE_ENV: 'production',
      KYMA_PROCESSING_WRITE_KEY: 'secret-key',
    }
    expect(hasTrustedProcessingKeyForEnv(env, 'secret-key')).toBe(true)
    expect(hasTrustedProcessingKeyForEnv(env, 'wrong')).toBe(false)
    expect(hasTrustedProcessingKeyForEnv(env, '')).toBe(false)
    expect(hasTrustedProcessingKeyForEnv(env, undefined)).toBe(false)
  })

  test('configured key wins even in development', () => {
    const env = {
      NODE_ENV: 'development',
      KYMA_PROCESSING_WRITE_KEY: 'dev-secret',
    }
    expect(allowsLocalProcessingKeyFallback(env)).toBe(false)
    expect(hasTrustedProcessingKeyForEnv(env, 'dev-secret')).toBe(true)
    expect(hasTrustedProcessingKeyForEnv(env, '')).toBe(false)
  })
})
