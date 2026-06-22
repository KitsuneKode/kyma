import { describe, expect, test } from 'vitest'

import {
  getGoogleProviderKey,
  getPlatformProviderKey,
  hasPlatformProviderKey,
} from '@/lib/env/providers'

describe('provider key resolution', () => {
  test('prefers GOOGLE_API_KEY over GEMINI_API_KEY', () => {
    expect(
      getGoogleProviderKey({
        GOOGLE_API_KEY: 'google-key',
        GEMINI_API_KEY: 'gemini-key',
      })
    ).toBe('google-key')
  })

  test('falls back to GEMINI_API_KEY when GOOGLE_API_KEY is absent', () => {
    expect(
      getGoogleProviderKey({
        GEMINI_API_KEY: 'gemini-key',
      })
    ).toBe('gemini-key')
  })

  test('detects configured platform keys by provider', () => {
    const env = {
      OPENAI_API_KEY: 'openai',
      GOOGLE_API_KEY: 'google',
      ANTHROPIC_API_KEY: 'anthropic',
    }

    expect(hasPlatformProviderKey('openai', env)).toBe(true)
    expect(getPlatformProviderKey('google', env)).toBe('google')
    expect(hasPlatformProviderKey('anthropic', env)).toBe(true)
  })
})
