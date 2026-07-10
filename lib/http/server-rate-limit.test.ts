import { beforeEach, describe, expect, test, vi } from 'vitest'

const fetchAction = vi.fn()
const serverEnvState = {
  NODE_ENV: 'production' as string,
  KYMA_PROCESSING_WRITE_KEY: undefined as string | undefined,
}

vi.mock('convex/nextjs', () => ({
  fetchAction: (...args: unknown[]) => fetchAction(...args),
}))

vi.mock('@/lib/env/server', () => ({
  serverEnv: serverEnvState,
}))

describe('assertServerRateLimit', () => {
  beforeEach(() => {
    fetchAction.mockReset()
    vi.resetModules()
    serverEnvState.NODE_ENV = 'production'
    serverEnvState.KYMA_PROCESSING_WRITE_KEY = undefined
  })

  test('throws in production when KYMA_PROCESSING_WRITE_KEY is missing', async () => {
    serverEnvState.NODE_ENV = 'production'
    serverEnvState.KYMA_PROCESSING_WRITE_KEY = undefined

    const { assertServerRateLimit } = await import('./server-rate-limit')

    await expect(
      assertServerRateLimit('publicSnapshot', 'process:127.0.0.1')
    ).rejects.toThrow('Rate limiting is not configured for production.')
    expect(fetchAction).not.toHaveBeenCalled()
  })

  test('no-ops in development when key is missing', async () => {
    serverEnvState.NODE_ENV = 'development'
    serverEnvState.KYMA_PROCESSING_WRITE_KEY = undefined

    const { assertServerRateLimit } = await import('./server-rate-limit')

    await expect(
      assertServerRateLimit('publicSnapshot', 'process:127.0.0.1')
    ).resolves.toBeUndefined()
    expect(fetchAction).not.toHaveBeenCalled()
  })

  test('calls Convex rate limiter when key is configured', async () => {
    serverEnvState.NODE_ENV = 'production'
    serverEnvState.KYMA_PROCESSING_WRITE_KEY = 'prod-secret'
    fetchAction.mockResolvedValue({ ok: true })

    const { assertServerRateLimit } = await import('./server-rate-limit')

    await assertServerRateLimit('publicSnapshot', 'process:127.0.0.1')

    expect(fetchAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: 'publicSnapshot',
        key: 'process:127.0.0.1',
        writeKey: 'prod-secret',
      })
    )
  })

  test('accepts livekitToken budget name for bootstrap token mint', async () => {
    serverEnvState.NODE_ENV = 'production'
    serverEnvState.KYMA_PROCESSING_WRITE_KEY = 'prod-secret'
    fetchAction.mockResolvedValue({ ok: true })

    const { assertServerRateLimit } = await import('./server-rate-limit')

    await assertServerRateLimit(
      'livekitToken',
      'livekit:127.0.0.1:invite-token-abc'
    )

    expect(fetchAction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: 'livekitToken',
        key: 'livekit:127.0.0.1:invite-token-abc',
        writeKey: 'prod-secret',
      })
    )
  })
})
