import { createDecipheriv } from 'node:crypto'

import {
  getPlatformProviderKey,
  type ProviderKeyEnv,
} from '@/lib/env/providers'
import {
  DEFAULT_MODELS,
  latestProviderKey,
  providerFromModelId,
  type ModelKind,
  type WorkspaceProviderKey,
} from '@/lib/providers/provider-id'

export {
  providerFromModelId,
  type ModelKind,
  type WorkspaceProviderKey,
} from '@/lib/providers/provider-id'

type WorkspaceModelOverrides = Partial<Record<ModelKind, string | undefined>>

export type { WorkspaceModelOverrides }

export type ReviewChatModelResolution = {
  modelId?: string
  canAttemptModel: boolean
  degradedReason?: string
}

const MODEL_KINDS: ModelKind[] = ['stt', 'llm', 'tts', 'reviewChat', 'scoring']

export function resolveStageModels(args: {
  workspaceDefaults?: WorkspaceModelOverrides
  templateOverrides?: WorkspaceModelOverrides
  envFallbacks?: WorkspaceModelOverrides
}): Record<ModelKind, string> {
  return Object.fromEntries(
    MODEL_KINDS.map((kind) => [
      kind,
      resolveModelId(
        kind,
        args.workspaceDefaults,
        args.templateOverrides,
        args.envFallbacks
      ),
    ])
  ) as Record<ModelKind, string>
}

export function resolveModelId(
  kind: ModelKind,
  workspaceDefaults?: WorkspaceModelOverrides,
  templateOverrides?: WorkspaceModelOverrides,
  envFallbacks: WorkspaceModelOverrides = {}
) {
  return (
    templateOverrides?.[kind]?.trim() ||
    workspaceDefaults?.[kind]?.trim() ||
    envFallbacks[kind]?.trim() ||
    DEFAULT_MODELS[kind]
  )
}

/**
 * Explicit review-chat model only — never falls back to DEFAULT_MODELS.reviewChat.
 * Prefer template → workspace → env (e.g. KYMA_REVIEW_CHAT_MODEL).
 */
export function resolveExplicitReviewChatModelId(
  workspaceDefaults?: WorkspaceModelOverrides,
  templateOverrides?: WorkspaceModelOverrides,
  envFallbacks?: WorkspaceModelOverrides
): string | undefined {
  return (
    templateOverrides?.reviewChat?.trim() ||
    workspaceDefaults?.reviewChat?.trim() ||
    envFallbacks?.reviewChat?.trim() ||
    undefined
  )
}

/**
 * @deprecated Prefer resolveExplicitReviewChatModelId for chat gating.
 * Kept for scoring fallback chains that still want an optional reviewChat id
 * without DEFAULT_MODELS — same behavior as explicit resolution.
 */
export function resolveReviewChatModelId(
  workspaceDefaults?: WorkspaceModelOverrides,
  templateOverrides?: WorkspaceModelOverrides,
  envFallbacks?: WorkspaceModelOverrides
): string | undefined {
  return resolveExplicitReviewChatModelId(
    workspaceDefaults,
    templateOverrides,
    envFallbacks
  )
}

export function hasReviewChatCredentials(args: {
  modelId: string
  providerKeys?: WorkspaceProviderKey[]
  encryptionKey?: string
  platformEnv?: ProviderKeyEnv
  aad?: string
}): boolean {
  const provider = providerFromModelId(args.modelId)
  if (!provider) return false

  if (
    args.platformEnv &&
    getPlatformProviderKey(provider, args.platformEnv)?.trim()
  ) {
    return true
  }

  const keyRecord = latestProviderKey(args.providerKeys, provider)
  if (!keyRecord || !args.encryptionKey?.trim()) {
    return false
  }

  try {
    const apiKey = decryptWorkspaceKey({
      encryptedKey: keyRecord.encryptedKey,
      iv: keyRecord.iv,
      encryptionKey: args.encryptionKey,
      aad: args.aad,
    }).trim()
    return Boolean(apiKey)
  } catch {
    return false
  }
}

/**
 * Honest review-chat gating: only attempt a model when an explicit model id is
 * configured AND credentials exist (platform env key or decryptable BYOK).
 */
export function resolveReviewChatAttempt(args: {
  workspaceDefaults?: WorkspaceModelOverrides
  templateOverrides?: WorkspaceModelOverrides
  envFallbacks?: WorkspaceModelOverrides
  providerKeys?: WorkspaceProviderKey[]
  encryptionKey?: string
  platformEnv?: ProviderKeyEnv
  aad?: string
}): ReviewChatModelResolution {
  const modelId = resolveExplicitReviewChatModelId(
    args.workspaceDefaults,
    args.templateOverrides,
    args.envFallbacks
  )

  if (!modelId) {
    return {
      canAttemptModel: false,
      degradedReason:
        'No explicit review-chat model configured (workspace, template, or KYMA_REVIEW_CHAT_MODEL).',
    }
  }

  if (
    !hasReviewChatCredentials({
      modelId,
      providerKeys: args.providerKeys,
      encryptionKey: args.encryptionKey,
      platformEnv: args.platformEnv,
      aad: args.aad,
    })
  ) {
    return {
      modelId,
      canAttemptModel: false,
      degradedReason:
        'Review-chat model is configured but no platform or workspace credentials are available for its provider.',
    }
  }

  return {
    modelId,
    canAttemptModel: true,
  }
}

export function resolveScoringModelId(
  workspaceDefaults?: WorkspaceModelOverrides,
  templateOverrides?: WorkspaceModelOverrides,
  envFallbacks: WorkspaceModelOverrides = {}
): string {
  const explicitScoring =
    templateOverrides?.scoring?.trim() ||
    workspaceDefaults?.scoring?.trim() ||
    envFallbacks.scoring?.trim()
  if (explicitScoring) {
    return explicitScoring
  }

  const reviewChatFallback = resolveReviewChatModelId(
    workspaceDefaults,
    templateOverrides,
    envFallbacks
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

function tryDecryptWithKey(
  encryptedKey: string,
  iv: string,
  keyHex: string,
  aad?: string
): string {
  const keyBytes = parseHexKeyBytes(keyHex)
  const ivBytes = Buffer.from(iv, 'base64')
  const encryptedBytes = Buffer.from(encryptedKey, 'base64')
  if (encryptedBytes.length < 16) {
    throw new Error('Encrypted provider key payload is invalid.')
  }
  const authTag = encryptedBytes.subarray(encryptedBytes.length - 16)
  const ciphertext = encryptedBytes.subarray(0, encryptedBytes.length - 16)
  const tryDecrypt = (withAad: boolean) => {
    const decipher = createDecipheriv('aes-256-gcm', keyBytes, ivBytes)
    if (withAad && aad?.trim()) {
      decipher.setAAD(Buffer.from(aad.trim()))
    }
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ])
    return decrypted.toString('utf8')
  }
  if (aad?.trim()) {
    try {
      return tryDecrypt(true)
    } catch {
      return tryDecrypt(false)
    }
  }
  return tryDecrypt(false)
}

export function decryptWorkspaceKey(args: {
  encryptedKey: string
  iv: string
  encryptionKey?: string
  aad?: string
  previousEncryptionKey?: string
}) {
  const key = args.encryptionKey?.trim()
  if (!key) {
    throw new Error(
      'KYMA_ENCRYPTION_KEY is required for provider key resolution.'
    )
  }
  const keysToTry = [key, args.previousEncryptionKey?.trim()].filter(
    (k): k is string => Boolean(k && /^[a-f0-9]{64}$/i.test(k))
  )
  let lastError: unknown = null
  for (const k of keysToTry) {
    try {
      return tryDecryptWithKey(args.encryptedKey, args.iv, k, args.aad)
    } catch (e) {
      lastError = e
      continue
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('BYOK decryption failed.')
}

export function resolveWorkspaceApiKeys(
  providerKeys?: WorkspaceProviderKey[],
  encryptionKey?: string,
  aad?: string
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
          encryptionKey,
          aad,
        }).trim()
      : undefined,
    google: googleRecord
      ? decryptWorkspaceKey({
          encryptedKey: googleRecord.encryptedKey,
          iv: googleRecord.iv,
          encryptionKey,
          aad,
        }).trim()
      : undefined,
  }
}

export function tryResolveWorkspaceApiKeys(
  providerKeys?: WorkspaceProviderKey[],
  encryptionKey?: string,
  aad?: string
): {
  apiKeys: { openai?: string; google?: string }
  error?: string
} {
  if (!providerKeys?.length) {
    return { apiKeys: {} }
  }

  try {
    return {
      apiKeys: resolveWorkspaceApiKeys(providerKeys, encryptionKey, aad),
    }
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
  encryptionKey?: string
  aad?: string
}) {
  const provider = providerFromModelId(args.modelId)
  if (!provider) return undefined
  const keyRecord = latestProviderKey(args.providerKeys, provider)
  if (!keyRecord) return undefined
  const apiKey = decryptWorkspaceKey({
    encryptedKey: keyRecord.encryptedKey,
    iv: keyRecord.iv,
    encryptionKey: args.encryptionKey,
    aad: args.aad,
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
