import { createCipheriv, randomBytes } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { DEFAULT_MODELS } from '@/lib/providers/provider-id'
import {
  buildGatewayByokOptions,
  resolveExplicitReviewChatModelId,
  resolveModelId,
  resolveReviewChatAttempt,
  resolveScoringModelId,
  resolveStageModels,
} from '@/lib/providers/resolve-model'

function encryptedProviderKey(plaintext: string, aad: string) {
  const key = Buffer.alloc(32, 7)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from(aad))
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ])

  return {
    encryptionKey: key.toString('hex'),
    providerKey: {
      keyId: 'key-1',
      provider: 'openai',
      encryptedKey: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      addedAt: Date.now(),
      addedBy: 'test',
    },
  }
}

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

describe('BYOK resolution', () => {
  it('decrypts org-bound provider keys only with the matching AAD', () => {
    const orgId = 'org_test'
    const fixture = encryptedProviderKey('sk-test-provider-key', orgId)
    const providerKeys = [fixture.providerKey]

    expect(
      resolveReviewChatAttempt({
        envFallbacks: { reviewChat: 'openai/gpt-4.1-mini' },
        providerKeys,
        encryptionKey: fixture.encryptionKey,
        aad: orgId,
      })
    ).toMatchObject({
      modelId: 'openai/gpt-4.1-mini',
      canAttemptModel: true,
    })

    expect(
      resolveReviewChatAttempt({
        envFallbacks: { reviewChat: 'openai/gpt-4.1-mini' },
        providerKeys,
        encryptionKey: fixture.encryptionKey,
        aad: 'org_other',
      }).canAttemptModel
    ).toBe(false)
  })

  it('passes the decrypted org key to the AI SDK gateway', () => {
    const fixture = encryptedProviderKey('sk-test-provider-key', 'org_test')

    expect(
      buildGatewayByokOptions({
        modelId: 'openai/gpt-4.1-mini',
        providerKeys: [fixture.providerKey],
        encryptionKey: fixture.encryptionKey,
        aad: 'org_test',
      })
    ).toEqual({
      gateway: {
        byok: {
          openai: [{ apiKey: 'sk-test-provider-key' }],
        },
      },
    })
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

describe('reviewChat gating', () => {
  it('does not default review chat to DEFAULT_MODELS.reviewChat', () => {
    expect(resolveExplicitReviewChatModelId()).toBeUndefined()
    expect(
      resolveExplicitReviewChatModelId(undefined, undefined, {
        reviewChat: '   ',
      })
    ).toBeUndefined()
  })

  it('prefers template over workspace over env for explicit review chat', () => {
    expect(
      resolveExplicitReviewChatModelId(
        { reviewChat: 'workspace/review' },
        { reviewChat: 'template/review' },
        { reviewChat: 'env/review' }
      )
    ).toBe('template/review')
  })

  it('refuses model attempt without explicit config', () => {
    const resolution = resolveReviewChatAttempt({
      platformEnv: { OPENAI_API_KEY: 'sk-test' },
    })
    expect(resolution.canAttemptModel).toBe(false)
    expect(resolution.modelId).toBeUndefined()
    expect(resolution.degradedReason).toMatch(/explicit/i)
  })

  it('refuses model attempt when credentials are missing', () => {
    const resolution = resolveReviewChatAttempt({
      envFallbacks: { reviewChat: 'openai/gpt-4.1-mini' },
      platformEnv: {},
    })
    expect(resolution.canAttemptModel).toBe(false)
    expect(resolution.modelId).toBe('openai/gpt-4.1-mini')
    expect(resolution.degradedReason).toMatch(/credentials/i)
  })

  it('allows model attempt with explicit config and platform key', () => {
    const resolution = resolveReviewChatAttempt({
      workspaceDefaults: { reviewChat: 'openai/gpt-4.1-mini' },
      platformEnv: { OPENAI_API_KEY: 'sk-test' },
    })
    expect(resolution).toEqual({
      modelId: 'openai/gpt-4.1-mini',
      canAttemptModel: true,
    })
  })
})
