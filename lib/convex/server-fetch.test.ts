import { describe, expect, test } from 'vitest'

import { runConvexFetch } from './server-fetch'

describe('runConvexFetch', () => {
  test('returns data on success', async () => {
    const result = await runConvexFetch(async () => ({ id: 'abc' }))
    expect(result).toEqual({ ok: true, data: { id: 'abc' } })
  })

  test('classifies auth errors', async () => {
    const result = await runConvexFetch(async () => {
      throw new Error('You must be signed in to access interviews.')
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('auth')
    }
  })

  test('classifies forbidden errors', async () => {
    const result = await runConvexFetch(async () => {
      throw new Error('You are not authorized to access recruiter data.')
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('forbidden')
    }
  })

  test('classifies not found errors', async () => {
    const result = await runConvexFetch(async () => {
      throw new Error('Interview session not found for this organization.')
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('not_found')
    }
  })
})
