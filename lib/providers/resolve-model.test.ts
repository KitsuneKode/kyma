import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_MODELS } from '@/lib/providers/provider-id'

const mockRuntimeEnv = vi.hoisted(() => ({
  LIVEKIT_AGENT_STT_MODEL: undefined as string | undefined,
  LIVEKIT_AGENT_LLM_MODEL: undefined as string | undefined,
  LIVEKIT_AGENT_TTS_MODEL: undefined as string | undefined,
  KYMA_REVIEW_CHAT_MODEL: undefined as string | undefined,
  KYMA_SCORING_MODEL: undefined as string | undefined,
}))

vi.mock('@/lib/env/runtime', () => ({
  runtimeEnv: mockRuntimeEnv,
}))

import {
  resolveModelId,
  resolveScoringModelId,
  resolveStageModels,
} from '@/lib/providers/resolve-model'

describe('resolveModelId precedence', () => {
  beforeEach(() => {
    mockRuntimeEnv.LIVEKIT_AGENT_STT_MODEL = undefined
    mockRuntimeEnv.LIVEKIT_AGENT_LLM_MODEL = undefined
    mockRuntimeEnv.LIVEKIT_AGENT_TTS_MODEL = undefined
    mockRuntimeEnv.KYMA_REVIEW_CHAT_MODEL = undefined
    mockRuntimeEnv.KYMA_SCORING_MODEL = undefined
  })

  it('prefers template over workspace over env over default', () => {
    mockRuntimeEnv.LIVEKIT_AGENT_LLM_MODEL = 'env/llm'

    expect(
      resolveModelId('llm', { llm: 'workspace/llm' }, { llm: 'template/llm' })
    ).toBe('template/llm')

    expect(resolveModelId('llm', { llm: 'workspace/llm' })).toBe(
      'workspace/llm'
    )

    expect(resolveModelId('llm')).toBe('env/llm')

    mockRuntimeEnv.LIVEKIT_AGENT_LLM_MODEL = undefined
    expect(resolveModelId('llm')).toBe(DEFAULT_MODELS.llm)
  })

  it('ignores blank override strings', () => {
    expect(resolveModelId('tts', { tts: '   ' }, { tts: 'template/tts' })).toBe(
      'template/tts'
    )
  })
})

describe('resolveStageModels', () => {
  beforeEach(() => {
    mockRuntimeEnv.LIVEKIT_AGENT_STT_MODEL = 'env/stt'
    mockRuntimeEnv.LIVEKIT_AGENT_LLM_MODEL = 'env/llm'
    mockRuntimeEnv.LIVEKIT_AGENT_TTS_MODEL = 'env/tts'
    mockRuntimeEnv.KYMA_REVIEW_CHAT_MODEL = 'env/review'
    mockRuntimeEnv.KYMA_SCORING_MODEL = 'env/scoring'
  })

  it('returns all five model kinds', () => {
    const resolved = resolveStageModels({
      workspaceDefaults: { llm: 'workspace/llm' },
      templateOverrides: { scoring: 'template/scoring' },
    })

    expect(resolved).toEqual({
      stt: 'env/stt',
      llm: 'workspace/llm',
      tts: 'env/tts',
      reviewChat: 'env/review',
      scoring: 'template/scoring',
    })
  })
})

describe('resolveScoringModelId', () => {
  beforeEach(() => {
    mockRuntimeEnv.KYMA_SCORING_MODEL = undefined
    mockRuntimeEnv.KYMA_REVIEW_CHAT_MODEL = undefined
  })

  it('falls back to review chat model when scoring is unset', () => {
    expect(
      resolveScoringModelId(
        { reviewChat: 'workspace/review' },
        { scoring: '   ' }
      )
    ).toBe('workspace/review')
  })

  it('uses default scoring model when nothing else is configured', () => {
    expect(resolveScoringModelId()).toBe(DEFAULT_MODELS.scoring)
  })
})
