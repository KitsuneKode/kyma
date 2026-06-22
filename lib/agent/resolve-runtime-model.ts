import type { llm } from '@livekit/agents'
import * as google from '@livekit/agents-plugin-google'
import * as openai from '@livekit/agents-plugin-openai'

import { runtimeEnv } from '@/lib/env/runtime'

export type RealtimeProvider = 'gemini' | 'openai' | 'cascade'

export type CascadeModelConfig = {
  mode: 'cascade'
  stt: string
  llm: string
  tts: string
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
        apiKey: options.apiKeys?.openai ?? process.env.OPENAI_API_KEY,
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
        apiKey:
          options.apiKeys?.google ??
          process.env.GOOGLE_API_KEY ??
          process.env.GEMINI_API_KEY,
      }),
    }
  }

  return {
    mode: 'cascade',
    stt: options.cascade.stt,
    llm: options.cascade.llm,
    tts: options.cascade.tts,
  }
}
