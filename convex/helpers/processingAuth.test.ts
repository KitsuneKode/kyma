import { describe, expect, test, vi } from 'vitest'

import {
  allowsLocalProcessingKeyFallback,
  hasTrustedProcessingKeyForEnv,
} from './processingAuth'

describe('processingAuth', () => {
  test('never trusts empty keys when production NODE_ENV and key is missing', () => {
    const env = { NODE_ENV: 'production' as const }
    expect(allowsLocalProcessingKeyFallback(env)).toBe(false)
    expect(hasTrustedProcessingKeyForEnv(env, undefined)).toBe(false)
    expect(hasTrustedProcessingKeyForEnv(env, '')).toBe(false)
    expect(hasTrustedProcessingKeyForEnv(env, '__dev_preview__')).toBe(false)
  })

  test('never trusts empty keys when KYMA_DEPLOYMENT_ENV is production', () => {
    const env = {
      NODE_ENV: 'development' as const,
      KYMA_DEPLOYMENT_ENV: 'production' as const,
    }
    expect(allowsLocalProcessingKeyFallback(env)).toBe(false)
    expect(hasTrustedProcessingKeyForEnv(env, '')).toBe(false)
  })

  test('requires BOTH signals before trusting an empty key', () => {
    // NODE_ENV alone is not enough: the validated shim defaults it to
    // 'development', so a deployment that simply never set its env vars would
    // otherwise trust an empty key from an anonymous caller.
    const nodeEnvOnly = { NODE_ENV: 'development' as const }
    expect(allowsLocalProcessingKeyFallback(nodeEnvOnly)).toBe(false)
    expect(hasTrustedProcessingKeyForEnv(nodeEnvOnly, '')).toBe(false)
  })

  test('allows local empty-key fallback in clear development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const env = {
      NODE_ENV: 'development' as const,
      KYMA_DEPLOYMENT_ENV: 'development' as const,
    }
    expect(allowsLocalProcessingKeyFallback(env)).toBe(true)
    expect(hasTrustedProcessingKeyForEnv(env, undefined)).toBe(true)
    expect(hasTrustedProcessingKeyForEnv(env, '')).toBe(true)
    expect(hasTrustedProcessingKeyForEnv(env, '__dev_preview__')).toBe(true)
    expect(hasTrustedProcessingKeyForEnv(env, 'other')).toBe(false)
    vi.unstubAllEnvs()
  })

  test('does not allow empty-key fallback in test NODE_ENV without a key', () => {
    const env = { NODE_ENV: 'test' as const }
    expect(allowsLocalProcessingKeyFallback(env)).toBe(false)
    expect(hasTrustedProcessingKeyForEnv(env, '')).toBe(false)
  })

  test('matches configured key when present', () => {
    const env = {
      NODE_ENV: 'production' as const,
      KYMA_PROCESSING_WRITE_KEY: 'secret-key',
    }
    expect(hasTrustedProcessingKeyForEnv(env, 'secret-key')).toBe(true)
    expect(hasTrustedProcessingKeyForEnv(env, 'wrong')).toBe(false)
    expect(hasTrustedProcessingKeyForEnv(env, '')).toBe(false)
  })
})
