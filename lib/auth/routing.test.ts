import { describe, expect, it } from 'vitest'

import {
  getPostSignInPathFromContext,
  resolveAppRoute,
  type AppRouteContext,
} from '@/lib/auth/routing'

function ctx(
  overrides: Partial<AppRouteContext> & { pathname: string }
): AppRouteContext {
  return {
    isSignedIn: true,
    preferredWorkspace: null,
    orgId: null,
    canAccessRecruiter: false,
    ...overrides,
  }
}

describe('getPostSignInPathFromContext', () => {
  it('sends unassigned users through auth continue (defaults to candidate)', () => {
    expect(
      getPostSignInPathFromContext({
        isSignedIn: true,
        preferredWorkspace: null,
        orgId: null,
        canAccessRecruiter: false,
      })
    ).toBe('/auth/continue')
  })

  it('sends recruiter preference without org to org setup', () => {
    expect(
      getPostSignInPathFromContext({
        isSignedIn: true,
        preferredWorkspace: 'recruiter',
        orgId: null,
        canAccessRecruiter: false,
      })
    ).toBe('/recruiter/setup')
  })

  it('sends recruiter with org access to recruiter home', () => {
    expect(
      getPostSignInPathFromContext({
        isSignedIn: true,
        preferredWorkspace: 'recruiter',
        orgId: 'org_test',
        canAccessRecruiter: true,
      })
    ).toBe('/recruiter')
  })

  it('sends candidate preference to candidate home', () => {
    expect(
      getPostSignInPathFromContext({
        isSignedIn: true,
        preferredWorkspace: 'candidate',
        orgId: null,
        canAccessRecruiter: false,
      })
    ).toBe('/candidate')
  })
})

describe('resolveAppRoute', () => {
  it('allows signed-in users on candidate routes without workspace preference', () => {
    expect(
      resolveAppRoute(
        ctx({
          pathname: '/candidate',
          preferredWorkspace: null,
        })
      )
    ).toBeNull()
  })

  it('does not redirect unassigned users away from candidate routes', () => {
    expect(
      resolveAppRoute(
        ctx({
          pathname: '/candidate/interviews',
          preferredWorkspace: null,
        })
      )
    ).toBeNull()
  })

  it('redirects recruiter routes without org to org setup', () => {
    expect(
      resolveAppRoute(
        ctx({
          pathname: '/recruiter',
          preferredWorkspace: 'recruiter',
        })
      )
    ).toBe('/recruiter/setup')
  })

  it('redirects recruiter routes without org permission to org setup', () => {
    expect(
      resolveAppRoute(
        ctx({
          pathname: '/recruiter',
          preferredWorkspace: 'recruiter',
          orgId: 'org_test',
          canAccessRecruiter: false,
        })
      )
    ).toBe('/recruiter/setup')
  })

  it('redirects legacy onboarding to auth continue', () => {
    expect(
      resolveAppRoute(
        ctx({
          pathname: '/onboarding',
          preferredWorkspace: null,
        })
      )
    ).toBe('/auth/continue')
  })

  it('redirects legacy recruiter onboarding to setup', () => {
    expect(
      resolveAppRoute(
        ctx({
          pathname: '/onboarding/recruiter',
          preferredWorkspace: 'recruiter',
        })
      )
    ).toBe('/recruiter/setup')
  })

  it('allows auth continue handler to run', () => {
    expect(
      resolveAppRoute(
        ctx({
          pathname: '/auth/continue',
          preferredWorkspace: null,
        })
      )
    ).toBeNull()
  })

  it('allows signed-in users on the marketing homepage', () => {
    expect(
      resolveAppRoute(
        ctx({
          pathname: '/',
          preferredWorkspace: 'candidate',
        })
      )
    ).toBeNull()
  })

  it('preserves recruiter intent when redirecting from recruiter sign-in', () => {
    expect(
      resolveAppRoute(
        ctx({
          pathname: '/sign-in/recruiter',
          preferredWorkspace: null,
        })
      )
    ).toBe('/auth/continue?workspace=recruiter')
  })

  it('preserves candidate intent when redirecting from candidate sign-in', () => {
    expect(
      resolveAppRoute(
        ctx({
          pathname: '/sign-in/candidate',
          preferredWorkspace: null,
        })
      )
    ).toBe('/auth/continue?workspace=candidate')
  })
})
