/**
 * Pure provider/model identity helpers shared by the Convex backend, the Next
 * app, and the LiveKit agent. Keep this module free of Node-only imports
 * (no `node:crypto`, no env access) so it can be bundled into Convex functions.
 */

export type ModelKind = 'stt' | 'llm' | 'tts' | 'reviewChat' | 'scoring'

export const DEFAULT_MODELS: Record<ModelKind, string> = {
  stt: 'deepgram/nova-3',
  llm: 'openai/gpt-4.1-mini',
  tts: 'cartesia/sonic',
  reviewChat: 'openai/gpt-4.1-mini',
  scoring: 'openai/gpt-4.1-mini',
}

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

export type ByokProvider = 'openai' | 'anthropic' | 'google'

export function normalizeProvider(provider: string) {
  const value = provider.trim().toLowerCase()
  if (value === 'gemini') return 'google'
  return value
}

export function providerFromModelId(modelId?: string): ByokProvider | null {
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

export function latestProviderKey(
  keys: WorkspaceProviderKey[] | undefined,
  provider: string
): WorkspaceProviderKey | null {
  const normalized = normalizeProvider(provider)
  const candidates = (keys ?? []).filter(
    (item) => normalizeProvider(item.provider) === normalized
  )
  if (!candidates.length) return null
  return candidates.toSorted((a, b) => b.addedAt - a.addedAt)[0]
}
