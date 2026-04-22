import { describe, expect, test } from 'vitest'
import { isDevelopmentMode, resolveRuntimeMode } from './runtime-mode'

describe('resolveRuntimeMode', () => {
  test('returns production only for production', () => {
    expect(resolveRuntimeMode('production')).toBe('production')
  })

  test('defaults to development for known non-production modes', () => {
    expect(resolveRuntimeMode('development')).toBe('development')
    expect(resolveRuntimeMode('test')).toBe('development')
  })

  test('defaults to development for unknown or missing values', () => {
    expect(resolveRuntimeMode('staging')).toBe('development')
    expect(resolveRuntimeMode(undefined)).toBe('development')
  })
})

describe('isDevelopmentMode', () => {
  test('mirrors normalized runtime mode behavior', () => {
    expect(isDevelopmentMode('production')).toBe(false)
    expect(isDevelopmentMode('development')).toBe(true)
    expect(isDevelopmentMode('test')).toBe(true)
  })
})
