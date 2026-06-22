import { describe, expect, it } from 'vitest'

import { DEFAULT_MODELS } from '@/lib/providers/provider-id'
import {
  resolveModelId,
  resolveScoringModelId,
  resolveStageModels,
} from '@/lib/providers/resolve-model'

describe('resolveModelId precedence', () => {
  it('prefers template over workspace over env over default', () => {
    expect(
      resolveModelId(
        'llm',
        { llm: 'workspace/llm' },
        { llm: 'template/llm' },
        { llm: 'env/llm' }
      )
    ).toBe('template/llm')

    expect(
      resolveModelId('llm', { llm: 'workspace/llm' }, undefined, {
        llm: 'env/llm',
      })
    ).toBe('workspace/llm')

    expect(
      resolveModelId('llm', undefined, undefined, { llm: 'env/llm' })
    ).toBe('env/llm')

    expect(resolveModelId('llm')).toBe(DEFAULT_MODELS.llm)
  })

  it('ignores blank override strings', () => {
    expect(resolveModelId('tts', { tts: '   ' }, { tts: 'template/tts' })).toBe(
      'template/tts'
    )
  })
})

describe('resolveStageModels', () => {
  it('returns all five model kinds', () => {
    const resolved = resolveStageModels({
      workspaceDefaults: { llm: 'workspace/llm' },
      templateOverrides: { scoring: 'template/scoring' },
      envFallbacks: {
        stt: 'env/stt',
        llm: 'env/llm',
        tts: 'env/tts',
        reviewChat: 'env/review',
        scoring: 'env/scoring',
      },
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
