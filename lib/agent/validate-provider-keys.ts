export type ProviderKeyStub = {
  provider: string
  keyId: string
}

export type ValidateProviderKeysResult = {
  ok: boolean
  issues: string[]
}

export type ValidateProviderKeysOptions = {
  encryptionKeyConfigured?: boolean
}

/**
 * Guards obvious BYOK misconfigurations before interview bootstrap.
 * Full connectivity checks live in recruiter settings.
 */
export function validateProviderKeysForBootstrap(
  keys: ProviderKeyStub[],
  options: ValidateProviderKeysOptions = {}
): ValidateProviderKeysResult {
  const issues: string[] = []
  const supportedProviders = new Set([
    'openai',
    'google',
    'gemini',
    'anthropic',
  ])

  if (keys.length > 0 && !options.encryptionKeyConfigured) {
    issues.push(
      'Workspace provider keys are stored but KYMA_ENCRYPTION_KEY is not configured on the server.'
    )
  }

  for (const key of keys) {
    const provider = key.provider.trim().toLowerCase()
    if (!provider) {
      issues.push(`Provider key ${key.keyId} is missing a provider name.`)
      continue
    }

    const normalizedProvider = provider === 'gemini' ? 'google' : provider
    if (!supportedProviders.has(normalizedProvider)) {
      issues.push(
        `Provider "${key.provider}" is not supported for interview bootstrap yet.`
      )
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  }
}
