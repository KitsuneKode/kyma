import { runtimeEnv } from '@/lib/env/runtime'
import { createDecipheriv } from 'node:crypto'

export type ModelKind = 'stt' | 'llm' | 'tts' | 'reviewChat' | 'scoring'

const DEFAULT_MODELS: Record<ModelKind, string> = {
  stt: 'deepgram/nova-3',
  llm: 'openai/gpt-4.1-mini',
  tts: 'cartesia/sonic',
  reviewChat: 'openai/gpt-4.1-mini',
  scoring: 'openai/gpt-4.1-mini',
}

type WorkspaceModelOverrides = Partial<Record<ModelKind, string | undefined>>

export type WorkspaceProviderKey = {
  keyId: string
  provider: string
  encryptedKey: string
  iv: string
  label?: string
  addedAt: number
  addedBy: string
  maskedKeyTail?: string
}

function normalizeProvider(provider: string) {
  const value = provider.trim().toLowerCase()
  if (value === 'gemini') return 'google'
  return value
}

export function resolveModelId(
  kind: ModelKind,
  workspaceDefaults?: WorkspaceModelOverrides,
  templateOverrides?: WorkspaceModelOverrides
) {
  const envFallbacks: WorkspaceModelOverrides = {
    stt: runtimeEnv.LIVEKIT_AGENT_STT_MODEL,
    llm: runtimeEnv.LIVEKIT_AGENT_LLM_MODEL,
    tts: runtimeEnv.LIVEKIT_AGENT_TTS_MODEL,
    reviewChat: runtimeEnv.KYMA_REVIEW_CHAT_MODEL,
    scoring: runtimeEnv.KYMA_SCORING_MODEL,
  }
  return (
    templateOverrides?.[kind]?.trim() ||
    workspaceDefaults?.[kind]?.trim() ||
    envFallbacks[kind]?.trim() ||
    DEFAULT_MODELS[kind]
  )
}

export function resolveReviewChatModelId(
  workspaceDefaults?: WorkspaceModelOverrides,
  templateOverrides?: WorkspaceModelOverrides
): string | undefined {
  return resolveModelId('reviewChat', workspaceDefaults, templateOverrides)
}

export function resolveScoringModelId(
  workspaceDefaults?: WorkspaceModelOverrides,
  templateOverrides?: WorkspaceModelOverrides
): string {
  const scoringModel = resolveModelId(
    'scoring',
    workspaceDefaults,
    templateOverrides
  )
  if (scoringModel) {
    return scoringModel
  }

  const reviewChatFallback = resolveReviewChatModelId(
    workspaceDefaults,
    templateOverrides
  )
  if (reviewChatFallback?.trim()) {
    return reviewChatFallback
  }

  return DEFAULT_MODELS.scoring
}

function parseHexKeyBytes(hex: string) {
  if (!/^[a-f0-9]{64}$/i.test(hex)) {
    throw new Error(
      'KYMA_ENCRYPTION_KEY must be a 64-char hex string (openssl rand -hex 32).'
    )
  }
  return Buffer.from(hex, 'hex')
}

export function decryptWorkspaceKey(args: {
  encryptedKey: string
  iv: string
}) {
  const key = runtimeEnv.KYMA_ENCRYPTION_KEY?.trim()
  if (!key) {
    throw new Error(
      'KYMA_ENCRYPTION_KEY is required for provider key resolution.'
    )
  }
  const keyBytes = parseHexKeyBytes(key)
  const ivBytes = Buffer.from(args.iv, 'base64')
  const encryptedBytes = Buffer.from(args.encryptedKey, 'base64')
  if (encryptedBytes.length < 16) {
    throw new Error('Encrypted provider key payload is invalid.')
  }
  const authTag = encryptedBytes.subarray(encryptedBytes.length - 16)
  const ciphertext = encryptedBytes.subarray(0, encryptedBytes.length - 16)
  const decipher = createDecipheriv('aes-256-gcm', keyBytes, ivBytes)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}

export function providerFromModelId(modelId?: string) {
  if (!modelId) return null
  const [provider] = modelId.split('/')
  const normalized = normalizeProvider(provider ?? '')
  if (
    normalized === 'openai' ||
    normalized === 'anthropic' ||
    normalized === 'google'
  ) {
    return normalized
  }
  return null
}

function latestProviderKey(
  keys: WorkspaceProviderKey[] | undefined,
  provider: string
) {
  const normalized = normalizeProvider(provider)
  const candidates = (keys ?? []).filter(
    (item) => normalizeProvider(item.provider) === normalized
  )
  if (!candidates.length) return null
  return candidates.toSorted((a, b) => b.addedAt - a.addedAt)[0]
}

export function resolveWorkspaceApiKeys(
  providerKeys?: WorkspaceProviderKey[]
): {
  openai?: string
  google?: string
} {
  const openaiRecord = latestProviderKey(providerKeys, 'openai')
  const googleRecord = latestProviderKey(providerKeys, 'google')

  return {
    openai: openaiRecord
      ? decryptWorkspaceKey({
          encryptedKey: openaiRecord.encryptedKey,
          iv: openaiRecord.iv,
        }).trim()
      : undefined,
    google: googleRecord
      ? decryptWorkspaceKey({
          encryptedKey: googleRecord.encryptedKey,
          iv: googleRecord.iv,
        }).trim()
      : undefined,
  }
}

export function tryResolveWorkspaceApiKeys(
  providerKeys?: WorkspaceProviderKey[]
): {
  apiKeys: { openai?: string; google?: string }
  error?: string
} {
  if (!providerKeys?.length) {
    return { apiKeys: {} }
  }

  try {
    return { apiKeys: resolveWorkspaceApiKeys(providerKeys) }
  } catch (error) {
    return {
      apiKeys: {},
      error:
        error instanceof Error
          ? error.message
          : 'Unable to decrypt workspace provider keys.',
    }
  }
}

export function buildGatewayByokOptions(args: {
  modelId?: string
  providerKeys?: WorkspaceProviderKey[]
}) {
  const provider = providerFromModelId(args.modelId)
  if (!provider) return undefined
  const keyRecord = latestProviderKey(args.providerKeys, provider)
  if (!keyRecord) return undefined
  const apiKey = decryptWorkspaceKey({
    encryptedKey: keyRecord.encryptedKey,
    iv: keyRecord.iv,
  }).trim()
  if (!apiKey) return undefined

  if (provider === 'openai') {
    return {
      gateway: {
        byok: {
          openai: [{ apiKey }],
        },
      },
    }
  }

  if (provider === 'anthropic') {
    return {
      gateway: {
        byok: {
          anthropic: [{ apiKey }],
        },
      },
    }
  }

  if (provider === 'google') {
    return {
      gateway: {
        byok: {
          google: [{ apiKey }],
        },
      },
    }
  }

  return undefined
}
