import { serverEnv } from '@/lib/env/server'
import { createDecipheriv } from 'node:crypto'

export type ModelKind = 'stt' | 'llm' | 'tts' | 'reviewChat'

const DEFAULT_MODELS: Record<ModelKind, string> = {
  stt: 'deepgram/nova-3',
  llm: 'openai/gpt-4.1-mini',
  tts: 'cartesia/sonic',
  reviewChat: 'openai/gpt-4.1-mini',
}

type WorkspaceModelOverrides = Partial<Record<ModelKind, string | undefined>>

export function resolveModelId(
  kind: ModelKind,
  workspaceDefaults?: WorkspaceModelOverrides,
  templateOverrides?: WorkspaceModelOverrides
) {
  const envFallbacks: WorkspaceModelOverrides = {
    stt: serverEnv.LIVEKIT_AGENT_STT_MODEL,
    llm: serverEnv.LIVEKIT_AGENT_LLM_MODEL,
    tts: serverEnv.LIVEKIT_AGENT_TTS_MODEL,
    reviewChat: serverEnv.KYMA_REVIEW_CHAT_MODEL,
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

export function decodeWorkspaceKey(encryptedKey: string) {
  // BYOK keys are stored server-side and should never be sent to clients.
  // This function centralizes runtime decode/decrypt behavior.
  if (!serverEnv.KYMA_ENCRYPTION_KEY?.trim()) {
    throw new Error(
      'KYMA_ENCRYPTION_KEY is required for provider key resolution.'
    )
  }
  return encryptedKey
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
  const key = serverEnv.KYMA_ENCRYPTION_KEY?.trim()
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
