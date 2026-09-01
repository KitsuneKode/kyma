import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const fetchQueryMock = vi.fn()
const fetchMutationMock = vi.fn()

vi.mock('convex/nextjs', () => ({
  fetchQuery: (...args: unknown[]) => fetchQueryMock(...args),
  fetchMutation: (...args: unknown[]) => fetchMutationMock(...args),
}))

const { createAgentSessionPort } = await import('./session-port')

type LogCall = { event: string; detail: string }

function createLogger() {
  const calls: { level: string; entry: LogCall }[] = []
  const record = (level: string) => (entry: LogCall) =>
    calls.push({ level, entry })

  return {
    calls,
    logger: {
      debug: record('debug'),
      info: record('info'),
      warn: record('warn'),
      error: record('error'),
    } as never,
  }
}

const SESSION_ID = 'session_123'

beforeEach(() => {
  fetchQueryMock.mockReset()
  fetchMutationMock.mockReset()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('fetchConfig failure handling', () => {
  test('rethrows instead of silently falling back to default prompts', async () => {
    const { logger, calls } = createLogger()
    fetchQueryMock.mockRejectedValueOnce(new Error('convex unreachable'))

    const port = createAgentSessionPort({ sessionId: SESSION_ID, logger })

    await expect(port.fetchConfig()).rejects.toThrow('convex unreachable')
    expect(
      calls.some(
        (call) =>
          call.level === 'error' &&
          call.entry.event === 'agent.config.fetch.failed'
      )
    ).toBe(true)
  })

  test('returns null without calling Convex when there is no session id', async () => {
    const { logger } = createLogger()
    const port = createAgentSessionPort({ sessionId: undefined, logger })

    await expect(port.fetchConfig()).resolves.toBeNull()
    expect(fetchQueryMock).not.toHaveBeenCalled()
  })

  test('passes the config through on success', async () => {
    const { logger } = createLogger()
    fetchQueryMock.mockResolvedValueOnce({ templateName: 'Custom' })

    const port = createAgentSessionPort({ sessionId: SESSION_ID, logger })

    await expect(port.fetchConfig()).resolves.toEqual({
      templateName: 'Custom',
    })
  })
})

describe('requestProcessing retry behaviour', () => {
  test('succeeds on the first attempt without retrying', async () => {
    const { logger } = createLogger()
    fetchMutationMock.mockResolvedValueOnce(undefined)

    const port = createAgentSessionPort({ sessionId: SESSION_ID, logger })
    await port.requestProcessing('done')

    expect(fetchMutationMock).toHaveBeenCalledTimes(1)
  })

  test('recovers when a transient failure is followed by success', async () => {
    const { logger } = createLogger()
    fetchMutationMock
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(undefined)

    const port = createAgentSessionPort({ sessionId: SESSION_ID, logger })
    const pending = port.requestProcessing('done')
    await vi.runAllTimersAsync()
    await pending

    expect(fetchMutationMock).toHaveBeenCalledTimes(2)
  })

  test('records a durable failure event when every attempt fails', async () => {
    const { logger, calls } = createLogger()
    fetchMutationMock
      .mockRejectedValueOnce(new Error('down'))
      .mockRejectedValueOnce(new Error('down'))
      .mockRejectedValueOnce(new Error('down'))
      // The final call is the durable session-event write.
      .mockResolvedValueOnce(undefined)

    const port = createAgentSessionPort({ sessionId: SESSION_ID, logger })
    const pending = port.requestProcessing('done')
    await vi.runAllTimersAsync()
    await pending

    expect(
      calls.some(
        (call) =>
          call.level === 'error' &&
          call.entry.event === 'agent.processing.request.exhausted'
      )
    ).toBe(true)

    const eventWrite = fetchMutationMock.mock.calls.at(-1)?.[1] as
      | { type?: string }
      | undefined
    expect(eventWrite?.type).toBe('processing-request-failed')
  })
})
