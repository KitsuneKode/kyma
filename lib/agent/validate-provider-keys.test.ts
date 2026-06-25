import { describe, expect, it } from 'vitest'

import { validateProviderKeysForBootstrap } from '@/lib/agent/validate-provider-keys'

describe('validateProviderKeysForBootstrap', () => {
  it('passes when no workspace keys are configured', () => {
    const result = validateProviderKeysForBootstrap([])
    expect(result.ok).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('requires encryption key when workspace keys exist', () => {
    const result = validateProviderKeysForBootstrap(
      [{ provider: 'openai', keyId: 'key_1' }],
      { encryptionKeyConfigured: false }
    )

    expect(result.ok).toBe(false)
    expect(result.issues[0]).toMatch(/KYMA_ENCRYPTION_KEY/i)
  })

  it('rejects unsupported providers', () => {
    const result = validateProviderKeysForBootstrap(
      [{ provider: 'unknown-vendor', keyId: 'key_2' }],
      { encryptionKeyConfigured: true }
    )

    expect(result.ok).toBe(false)
    expect(result.issues[0]).toMatch(/not supported/i)
  })
})
