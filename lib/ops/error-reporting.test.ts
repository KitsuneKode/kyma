import { afterEach, describe, expect, test, vi } from 'vitest'

import { reportError } from './error-reporting'

describe('reportError', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('logs via console.error and does not throw', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      reportError(new Error('boom'), {
        route: '/api/interviews/bootstrap',
        requestId: 'bootstrap_test',
      })
    ).resolves.toBeUndefined()

    expect(errorSpy).toHaveBeenCalled()
    const firstCall = errorSpy.mock.calls[0]
    expect(firstCall?.[0]).toBe('[ops:error]')
    expect(firstCall?.[1]).toMatchObject({
      message: 'boom',
      route: '/api/interviews/bootstrap',
      requestId: 'bootstrap_test',
    })
  })
})
