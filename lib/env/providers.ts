import type { ByokProvider } from '@/lib/providers/provider-id'

type ProviderKeyEnv = {
  OPENAI_API_KEY?: string
  GOOGLE_API_KEY?: string
  GEMINI_API_KEY?: string
  ANTHROPIC_API_KEY?: string
}

export function getGoogleProviderKey(env: ProviderKeyEnv) {
  return env.GOOGLE_API_KEY?.trim() || env.GEMINI_API_KEY?.trim()
}

export function getPlatformProviderKey(
  provider: ByokProvider,
  env: ProviderKeyEnv
) {
  switch (provider) {
    case 'openai':
      return env.OPENAI_API_KEY?.trim()
    case 'google':
      return getGoogleProviderKey(env)
    case 'anthropic':
      return env.ANTHROPIC_API_KEY?.trim()
    default:
      return undefined
  }
}

export function hasPlatformProviderKey(
  provider: ByokProvider,
  env: ProviderKeyEnv
) {
  return Boolean(getPlatformProviderKey(provider, env))
}
