import type { llm } from '@livekit/agents'
import * as google from '@livekit/agents-plugin-google'
import * as openai from '@livekit/agents-plugin-openai'

import { runtimeEnv } from '@/lib/env/runtime'
import { getGoogleProviderKey } from '@/lib/env/providers'
import { providerFromModelId } from '@/lib/providers/provider-id'

export type RealtimeProvider = 'gemini' | 'openai' | 'cascade'

export type CascadeModelConfig = {
  mode: 'cascade'
  stt: string
  /**
   * Either a gateway model id (resolved by LiveKit inference) or an explicit
   * provider LLM instance when an org BYOK key is threaded through.
   */
  llm: string | llm.LLM
  tts: string
  /** True when the LLM was bound to an explicit org/platform provider key. */
  llmUsesExplicitKey: boolean
}

export type RealtimeModelConfig = {
  mode: 'realtime'
  provider: Exclude<RealtimeProvider, 'cascade'>
  llm: llm.RealtimeModel
}

export type ResolvedRuntimeModel = CascadeModelConfig | RealtimeModelConfig

const GEMINI_REALTIME_MODEL = 'gemini-2.5-flash-native-audio-preview-12-2025'
const OPENAI_REALTIME_MODEL = 'gpt-realtime-mini'

export function resolveRealtimeProvider(): RealtimeProvider {
  const configured = runtimeEnv.KYMA_AGENT_REALTIME_PROVIDER ?? 'cascade'
  if (
    configured === 'gemini' ||
    configured === 'openai' ||
    configured === 'cascade'
  ) {
    return configured
  }

  return 'cascade'
}

export function resolveRuntimeModel(options: {
  cascade: {
    stt: string
    llm: string
    tts: string
  }
  apiKeys?: {
    openai?: string
    google?: string
  }
}): ResolvedRuntimeModel {
  const provider = resolveRealtimeProvider()

  if (provider === 'openai') {
    return {
      mode: 'realtime',
      provider: 'openai',
      llm: new openai.realtime.RealtimeModel({
        model: OPENAI_REALTIME_MODEL,
        apiKey: options.apiKeys?.openai ?? runtimeEnv.OPENAI_API_KEY,
      }),
    }
  }

  if (provider === 'gemini') {
    return {
      mode: 'realtime',
      provider: 'gemini',
      llm: new google.beta.realtime.RealtimeModel({
        model: GEMINI_REALTIME_MODEL,
        enableAffectiveDialog: true,
        apiKey: options.apiKeys?.google ?? getGoogleProviderKey(runtimeEnv),
      }),
    }
  }

  return {
    mode: 'cascade',
    stt: options.cascade.stt,
    tts: options.cascade.tts,
    ...resolveCascadeLlm(options.cascade.llm, options.apiKeys),
  }
}

/** Strip a gateway provider prefix (e.g. `openai/gpt-4.1-mini` -> `gpt-4.1-mini`). */
function stripProviderPrefix(modelId: string) {
  const slashIndex = modelId.indexOf('/')
  return slashIndex === -1 ? modelId : modelId.slice(slashIndex + 1)
}

/**
 * Cascade STT/TTS always route through the LiveKit inference gateway (so the
 * Deepgram/Cartesia model strings require those plugins/credentials to be
 * configured on the worker or LiveKit Cloud). The cascade LLM is the one place
 * we can honor an org BYOK key: when the LLM resolves to OpenAI and an OpenAI
 * key is available, bind an explicit `openai.LLM` instance so generation is
 * billed to the org key instead of the shared gateway. Otherwise fall back to
 * the gateway model id string.
 */
function resolveCascadeLlm(
  llmModelId: string,
  apiKeys?: { openai?: string; google?: string }
): { llm: string | llm.LLM; llmUsesExplicitKey: boolean } {
  const provider = providerFromModelId(llmModelId)
  const openaiKey = apiKeys?.openai ?? runtimeEnv.OPENAI_API_KEY

  if (provider === 'openai' && openaiKey) {
    return {
      llm: new openai.LLM({
        model: stripProviderPrefix(llmModelId),
        apiKey: openaiKey,
      }),
      llmUsesExplicitKey: Boolean(apiKeys?.openai),
    }
  }

  return { llm: llmModelId, llmUsesExplicitKey: false }
}
