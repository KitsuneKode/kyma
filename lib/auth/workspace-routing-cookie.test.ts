import { describe, expect, it } from 'vitest'

import {
  parseWorkspaceRoutingCookie,
  resolvePreferredWorkspaceForRouting,
  shouldClearWorkspaceRoutingCookie,
} from '@/lib/auth/workspace-routing-cookie'

describe('parseWorkspaceRoutingCookie', () => {
  it('accepts valid workspace values', () => {
    expect(parseWorkspaceRoutingCookie('candidate')).toBe('candidate')
    expect(parseWorkspaceRoutingCookie('recruiter')).toBe('recruiter')
  })

  it('rejects invalid values', () => {
    expect(parseWorkspaceRoutingCookie('both')).toBeNull()
    expect(parseWorkspaceRoutingCookie(undefined)).toBeNull()
  })
})

describe('resolvePreferredWorkspaceForRouting', () => {
  it('prefers session claims over routing cookie', () => {
    expect(
      resolvePreferredWorkspaceForRouting({
        sessionClaims: { metadata: { preferredWorkspace: 'candidate' } },
        routingCookie: 'recruiter',
      })
    ).toBe('candidate')
  })

  it('falls back to routing cookie when session claims are missing', () => {
    expect(
      resolvePreferredWorkspaceForRouting({
        sessionClaims: { metadata: {} },
        routingCookie: 'recruiter',
      })
    ).toBe('recruiter')
  })
})

describe('shouldClearWorkspaceRoutingCookie', () => {
  it('clears when session and cookie agree', () => {
    expect(
      shouldClearWorkspaceRoutingCookie({
        sessionClaims: { metadata: { preferredWorkspace: 'recruiter' } },
        routingCookie: 'recruiter',
      })
    ).toBe(true)
  })

  it('keeps cookie when session is still missing', () => {
    expect(
      shouldClearWorkspaceRoutingCookie({
        sessionClaims: { metadata: {} },
        routingCookie: 'recruiter',
      })
    ).toBe(false)
  })
})
