import { serverEnv } from '@/lib/env/server'

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
