import { describe, expect, it } from 'vitest'

import {
  resolveWorkspaceForContinue,
  shouldPersistWorkspaceForContinue,
} from '@/lib/auth/continue-workspace'

describe('resolveWorkspaceForContinue', () => {
  it('honors explicit candidate intent over existing recruiter preference', () => {
    expect(
      resolveWorkspaceForContinue({
        explicitIntent: 'candidate',
        existing: 'recruiter',
      })
    ).toBe('candidate')
  })

  it('honors explicit recruiter intent over existing candidate preference', () => {
    expect(
      resolveWorkspaceForContinue({
        explicitIntent: 'recruiter',
        existing: 'candidate',
      })
    ).toBe('recruiter')
  })

  it('uses existing preference when no explicit intent', () => {
    expect(
      resolveWorkspaceForContinue({
        explicitIntent: null,
        existing: 'recruiter',
      })
    ).toBe('recruiter')
  })

  it('defaults to candidate when no explicit intent or existing preference', () => {
    expect(
      resolveWorkspaceForContinue({
        explicitIntent: null,
        existing: null,
      })
    ).toBe('candidate')
  })
})

describe('shouldPersistWorkspaceForContinue', () => {
  it('persists when explicit intent is present', () => {
    expect(
      shouldPersistWorkspaceForContinue({
        explicitIntent: 'candidate',
        existing: 'recruiter',
      })
    ).toBe(true)
  })

  it('persists when preference is missing', () => {
    expect(
      shouldPersistWorkspaceForContinue({
        explicitIntent: null,
        existing: null,
      })
    ).toBe(true)
  })

  it('skips persist when existing preference and no explicit intent', () => {
    expect(
      shouldPersistWorkspaceForContinue({
        explicitIntent: null,
        existing: 'recruiter',
      })
    ).toBe(false)
  })
})
