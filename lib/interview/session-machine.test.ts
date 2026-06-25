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

  it('allows live to reconnecting and back to live', () => {
    expect(canTransitionSession('live', 'reconnecting')).toBe(true)
    expect(canTransitionSession('reconnecting', 'live')).toBe(true)
  })

  it('allows reconnecting to interrupted', () => {
    expect(canTransitionSession('reconnecting', 'interrupted')).toBe(true)
  })

  it('disallows completed to live', () => {
    expect(canTransitionSession('completed', 'live')).toBe(false)
  })

  it('disallows reconnecting to processing', () => {
    expect(canTransitionSession('reconnecting', 'processing')).toBe(false)
  })
})
