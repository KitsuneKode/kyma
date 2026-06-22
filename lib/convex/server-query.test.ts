import { describe, expect, test, vi } from 'vitest'

const mockClientEnv = vi.hoisted(() => ({
  NEXT_PUBLIC_CONVEX_URL: 'https://example.convex.cloud' as string | undefined,
}))

const mockAuth = vi.hoisted(() => ({
  token: 'test-token' as string | null,
}))

vi.mock('next/server', () => ({
  connection: vi.fn(async () => undefined),
}))

vi.mock('convex/nextjs', () => ({
  fetchQuery: vi.fn(async () => ({ ok: true })),
  fetchMutation: vi.fn(async () => ({ ok: true })),
}))

vi.mock('@/lib/clerk/server-token', () => ({
  getServerConvexAuthToken: vi.fn(async () => mockAuth.token),
}))

vi.mock('@/lib/env/client', () => ({
  clientEnv: mockClientEnv,
}))

describe('serverConvexQuery', () => {
  test('establishes a dynamic boundary before returning fallback without Convex URL', async () => {
    const { connection } = await import('next/server')
    const { fetchQuery } = await import('convex/nextjs')
    const { serverConvexQueryWithFallback } = await import('./server-query')
    const { api } = await import('@/convex/_generated/api')

    vi.mocked(connection).mockClear()
    vi.mocked(fetchQuery).mockClear()
    mockClientEnv.NEXT_PUBLIC_CONVEX_URL = undefined

    const result = await serverConvexQueryWithFallback(
      api.recruiter.listReviewCandidates,
      {},
      []
    )

    expect(connection).toHaveBeenCalled()
    expect(fetchQuery).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true, data: [] })

    mockClientEnv.NEXT_PUBLIC_CONVEX_URL = 'https://example.convex.cloud'
  })

  test('establishes a dynamic boundary before returning fallback without token', async () => {
    const { connection } = await import('next/server')
    const { fetchQuery } = await import('convex/nextjs')
    const { serverConvexQueryWithFallback } = await import('./server-query')
    const { api } = await import('@/convex/_generated/api')

    vi.mocked(connection).mockClear()
    vi.mocked(fetchQuery).mockClear()
    mockAuth.token = null

    const result = await serverConvexQueryWithFallback(
      api.recruiter.listReviewCandidates,
      {},
      []
    )

    expect(connection).toHaveBeenCalled()
    expect(fetchQuery).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true, data: [] })

    mockAuth.token = 'test-token'
  })

  test('establishes a dynamic boundary before calling Convex', async () => {
    const { connection } = await import('next/server')
    const { fetchQuery } = await import('convex/nextjs')
    const { serverConvexQuery } = await import('./server-query')
    const { api } = await import('@/convex/_generated/api')

    await serverConvexQuery(api.recruiter.listReviewCandidates, {})

    expect(connection).toHaveBeenCalled()
    expect(fetchQuery).toHaveBeenCalled()
  })
})
