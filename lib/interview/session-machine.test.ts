import { describe, expect, it } from 'vitest'

import {
  canTransitionSession,
  resolveProcessingTransitionPath,
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

  it('disallows connecting to processing', () => {
    expect(canTransitionSession('connecting', 'processing')).toBe(false)
  })
})

describe('resolveProcessingTransitionPath', () => {
  it('uses a direct hop from live', () => {
    expect(resolveProcessingTransitionPath('live')).toEqual(['processing'])
  })

  it('uses a direct hop from interrupted', () => {
    expect(resolveProcessingTransitionPath('interrupted')).toEqual([
      'processing',
    ])
  })

  it('normalizes connecting through interrupted', () => {
    expect(resolveProcessingTransitionPath('connecting')).toEqual([
      'interrupted',
      'processing',
    ])
  })

  it('normalizes reconnecting through interrupted', () => {
    expect(resolveProcessingTransitionPath('reconnecting')).toEqual([
      'interrupted',
      'processing',
    ])
  })

  it('returns an empty path when already processing', () => {
    expect(resolveProcessingTransitionPath('processing')).toEqual([])
  })

  it('returns an empty path for terminal or pre-join states', () => {
    expect(resolveProcessingTransitionPath('ready')).toEqual([])
    expect(resolveProcessingTransitionPath('completed')).toEqual([])
    expect(resolveProcessingTransitionPath('failed')).toEqual([])
  })
})
