import { describe, expect, test } from 'vitest'

import { validateNextStartupEnvForEnv } from '@/lib/env/validate-startup'

const completeServerEnv = {
  NODE_ENV: 'production',
  KYMA_DEPLOYMENT_ENV: 'production',
  KYMA_PROCESSING_WRITE_KEY: 'prod-secret',
  CLERK_SECRET_KEY: 'clerk-secret',
  CLERK_WEBHOOK_SIGNING_SECRET: 'webhook-secret',
  CLERK_FRONTEND_API_URL: 'https://clerk.example.com',
  LIVEKIT_API_KEY: 'livekit-key',
  LIVEKIT_API_SECRET: 'livekit-secret',
  LIVEKIT_AGENT_NAME: 'tutor-screener',
  LIVEKIT_RECORDING_ENABLED: '0' as const,
  INNGEST_APP_ID: 'kyma',
  INNGEST_EVENT_KEY: 'inngest-event',
  INNGEST_SIGNING_KEY: 'inngest-signing',
}

const completeClientEnv = {
  NEXT_PUBLIC_CONVEX_URL: 'https://example.convex.cloud',
  NEXT_PUBLIC_LIVEKIT_URL: 'wss://example.livekit.cloud',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_example',
}

describe('startup validation modes', () => {
  test('allows local degraded mode as warnings', () => {
    const issues = validateNextStartupEnvForEnv({
      server: { NODE_ENV: 'development', LIVEKIT_RECORDING_ENABLED: '0' },
      client: {},
    })

    expect(issues.some((issue) => issue.severity === 'warn')).toBe(true)
    expect(issues.some((issue) => issue.severity === 'error')).toBe(false)
  })

  test('fails closed for missing production core and auth env', () => {
    const issues = validateNextStartupEnvForEnv({
      server: { NODE_ENV: 'production', KYMA_DEPLOYMENT_ENV: 'production' },
      client: {},
    })

    expect(issues.map((issue) => issue.id)).toEqual(
      expect.arrayContaining([
        'convex-url',
        'livekit-credentials',
        'clerk-admin-auth',
        'clerk-issuer',
        'processing-key',
        'inngest',
        'agent-runtime',
      ])
    )
    expect(issues.every((issue) => issue.severity === 'error')).toBe(true)
  })

  test('rejects production dev processing placeholder', () => {
    const issues = validateNextStartupEnvForEnv({
      server: {
        ...completeServerEnv,
        KYMA_PROCESSING_WRITE_KEY: '__dev_preview__',
      },
      client: completeClientEnv,
    })

    expect(issues).toContainEqual(
      expect.objectContaining({
        id: 'processing-key-placeholder',
        severity: 'error',
      })
    )
  })

  test('requires full recording storage when recording is enabled', () => {
    const issues = validateNextStartupEnvForEnv({
      server: {
        ...completeServerEnv,
        LIVEKIT_RECORDING_ENABLED: '1',
        LIVEKIT_RECORDING_STORAGE_BUCKET: 'bucket',
      },
      client: completeClientEnv,
    })

    expect(issues).toContainEqual(
      expect.objectContaining({
        id: 'recording-storage',
        severity: 'error',
      })
    )
  })

  test('passes for complete production env', () => {
    const issues = validateNextStartupEnvForEnv({
      server: completeServerEnv,
      client: completeClientEnv,
    })

    expect(issues).toEqual([])
  })
})
