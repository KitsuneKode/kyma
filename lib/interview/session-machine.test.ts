import { describe, expect, it } from 'vitest'

import {
  canTransitionSession,
  transitionSessionSafely,
} from './session-machine'

describe('transitionSessionSafely', () => {
  it('allows live to processing', () => {
    expect(transitionSessionSafely('live', 'processing')).toBe('processing')
  })

  it('rejects illegal transitions by keeping current state', () => {
    expect(transitionSessionSafely('ready', 'completed')).toBe('ready')
  })
})

describe('canTransitionSession', () => {
  it('allows connecting to live', () => {
    expect(canTransitionSession('connecting', 'live')).toBe(true)
  })

  it('disallows completed to live', () => {
    expect(canTransitionSession('completed', 'live')).toBe(false)
  })
})
