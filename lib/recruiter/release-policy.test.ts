import { describe, expect, test } from 'vitest'

import { shouldAutoRelease } from '../../convex/helpers/releasePolicy'

describe('shouldAutoRelease', () => {
  test('auto mode releases on advance and reject', () => {
    expect(shouldAutoRelease('advance', 'auto')).toBe(true)
    expect(shouldAutoRelease('reject', 'auto')).toBe(true)
  })

  test('auto mode does not release on hold or manual review', () => {
    expect(shouldAutoRelease('hold', 'auto')).toBe(false)
    expect(shouldAutoRelease('manual_review', 'auto')).toBe(false)
  })

  test('manual mode never auto-releases', () => {
    expect(shouldAutoRelease('advance', 'manual')).toBe(false)
    expect(shouldAutoRelease('reject', 'manual')).toBe(false)
  })
})
