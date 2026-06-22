import { DEFAULT_MODELS, type ModelKind } from '@/lib/providers/provider-id'

export type ModelCatalogEntry = {
  id: string
  label: string
  provider: string
}

export const MODEL_STAGE_LABELS: Record<
  ModelKind,
  { title: string; description: string }
> = {
  stt: {
    title: 'Speech-to-text',
    description: 'Transcribes candidate audio during the live interview.',
  },
  llm: {
    title: 'Interview LLM',
    description: 'Powers the realtime interviewer reasoning and responses.',
  },
  tts: {
    title: 'Text-to-speech',
    description: 'Synthesizes interviewer voice output during the interview.',
  },
  scoring: {
    title: 'Assessment scoring',
    description: 'Generates structured rubric scores after the interview ends.',
  },
  reviewChat: {
    title: 'Review chat',
    description: 'Answers recruiter questions about a candidate report.',
  },
}

export const MODEL_CATALOG: Record<ModelKind, ModelCatalogEntry[]> = {
  stt: [
    {
      id: 'deepgram/nova-3',
      label: 'Deepgram Nova 3',
      provider: 'deepgram',
    },
    {
      id: 'openai/gpt-4o-mini-transcribe',
      label: 'OpenAI GPT-4o Mini Transcribe',
      provider: 'openai',
    },
  ],
  llm: [
    {
      id: 'openai/gpt-4.1-mini',
      label: 'OpenAI GPT-4.1 Mini',
      provider: 'openai',
    },
    {
      id: 'openai/gpt-4.1',
      label: 'OpenAI GPT-4.1',
      provider: 'openai',
    },
    {
      id: 'anthropic/claude-sonnet-4.6',
      label: 'Anthropic Claude Sonnet 4.6',
      provider: 'anthropic',
    },
    {
      id: 'google/gemini-2.5-flash',
      label: 'Google Gemini 2.5 Flash',
      provider: 'google',
    },
  ],
  tts: [
    {
      id: 'cartesia/sonic',
      label: 'Cartesia Sonic',
      provider: 'cartesia',
    },
    {
      id: 'openai/gpt-4o-mini-tts',
      label: 'OpenAI GPT-4o Mini TTS',
      provider: 'openai',
    },
  ],
  scoring: [
    {
      id: 'openai/gpt-4.1-mini',
      label: 'OpenAI GPT-4.1 Mini',
      provider: 'openai',
    },
    {
      id: 'openai/gpt-4.1',
      label: 'OpenAI GPT-4.1',
      provider: 'openai',
    },
    {
      id: 'anthropic/claude-sonnet-4.6',
      label: 'Anthropic Claude Sonnet 4.6',
      provider: 'anthropic',
    },
  ],
  reviewChat: [
    {
      id: 'openai/gpt-4.1-mini',
      label: 'OpenAI GPT-4.1 Mini',
      provider: 'openai',
    },
    {
      id: 'anthropic/claude-sonnet-4.6',
      label: 'Anthropic Claude Sonnet 4.6',
      provider: 'anthropic',
    },
    {
      id: 'google/gemini-2.5-flash',
      label: 'Google Gemini 2.5 Flash',
      provider: 'google',
    },
  ],
}

export const CUSTOM_MODEL_VALUE = '__custom__'

export function isKnownModelId(kind: ModelKind, id: string) {
  const normalized = id.trim()
  if (!normalized) {
    return false
  }
  return MODEL_CATALOG[kind].some((entry) => entry.id === normalized)
}

export function formatModelLabel(modelId: string) {
  const normalized = modelId.trim()
  if (!normalized) {
    return 'Inherit default'
  }

  for (const entries of Object.values(MODEL_CATALOG)) {
    const match = entries.find((entry) => entry.id === normalized)
    if (match) {
      return match.label
    }
  }

  return normalized
}

export function defaultModelId(kind: ModelKind) {
  return DEFAULT_MODELS[kind]
}

export function configuredProviders(
  providerKeys?: Array<{ provider: string }>
): Set<string> {
  return new Set(
    (providerKeys ?? []).map((item) => item.provider.trim().toLowerCase())
  )
}

export function providerHasKey(
  provider: string,
  providerKeys?: Array<{ provider: string }>
) {
  const normalized = provider.trim().toLowerCase()
  if (normalized === 'deepgram' || normalized === 'cartesia') {
    return true
  }
  return configuredProviders(providerKeys).has(normalized)
}
