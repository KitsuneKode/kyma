import { afterEach, describe, expect, test, vi } from 'vitest'

const mockRuntime = vi.hoisted(() => ({
  mode: 'development' as 'development' | 'production',
}))

vi.mock('@/lib/env/node-env', () => ({
  getRuntimeModeFromNodeEnv: () => mockRuntime.mode,
}))

describe('redactInviteToken', () => {
  test('omits empty or missing tokens', async () => {
    const { redactInviteToken } = await import('./diagnostics')

    expect(redactInviteToken(undefined)).toBeUndefined()
    expect(redactInviteToken('')).toBeUndefined()
  })

  test('masks short tokens entirely', async () => {
    const { redactInviteToken } = await import('./diagnostics')

    expect(redactInviteToken('abc')).toBe('****')
    expect(redactInviteToken('abcd')).toBe('****')
  })

  test('keeps only the last 4 characters', async () => {
    const { redactInviteToken } = await import('./diagnostics')

    expect(redactInviteToken('invite-token-secret-xyz9')).toBe('***xyz9')
  })
})

describe('shouldLogDiagnostics', () => {
  afterEach(() => {
    mockRuntime.mode = 'development'
    vi.resetModules()
  })

  test('allows diagnostics outside production', async () => {
    mockRuntime.mode = 'development'
    const { shouldLogDiagnostics } = await import('./diagnostics')

    expect(shouldLogDiagnostics()).toBe(true)
  })

  test('never enables diagnostics in production (DEV_TRACE must not override)', async () => {
    // Historical bug: NEXT_PUBLIC_ENABLE_DEV_TRACE=1 could enable logs in
    // production. Gating is now runtime-mode only.
    mockRuntime.mode = 'production'
    const { shouldLogDiagnostics } = await import('./diagnostics')

    expect(shouldLogDiagnostics()).toBe(false)
  })

  test('does not log invite tokens when production gating is active', async () => {
    mockRuntime.mode = 'production'
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const { createDiagnosticLogger } = await import('./diagnostics')
    const logger = createDiagnosticLogger('test-scope')
    logger.info({
      event: 'test.event',
      inviteToken: 'super-secret-invite-token',
    })

    expect(infoSpy).not.toHaveBeenCalled()
    infoSpy.mockRestore()
  })

  test('redacts invite tokens when diagnostics are enabled', async () => {
    mockRuntime.mode = 'development'
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const { createDiagnosticLogger } = await import('./diagnostics')
    const logger = createDiagnosticLogger('test-scope')
    logger.info({
      event: 'test.event',
      inviteToken: 'super-secret-invite-token',
    })

    expect(infoSpy).toHaveBeenCalledTimes(1)
    const loggedEntry = infoSpy.mock.calls[0]?.[1] as {
      inviteToken?: string
    }
    expect(loggedEntry.inviteToken).toBe('***oken')
    expect(loggedEntry.inviteToken).not.toContain('super-secret')
    infoSpy.mockRestore()
  })
})
