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
    hasLegacyBoth: false,
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
        hasLegacyBoth: false,
        orgId: null,
        canAccessRecruiter: false,
      })
    ).toBe('/auth/continue')
  })

  it('sends recruiter preference without org to org onboarding', () => {
    expect(
      getPostSignInPathFromContext({
        isSignedIn: true,
        preferredWorkspace: 'recruiter',
        hasLegacyBoth: false,
        orgId: null,
        canAccessRecruiter: false,
      })
    ).toBe('/onboarding/recruiter')
  })

  it('sends recruiter with org access to recruiter home', () => {
    expect(
      getPostSignInPathFromContext({
        isSignedIn: true,
        preferredWorkspace: 'recruiter',
        hasLegacyBoth: false,
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
        hasLegacyBoth: false,
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

  it('redirects recruiter routes without org to org onboarding', () => {
    expect(
      resolveAppRoute(
        ctx({
          pathname: '/recruiter',
          preferredWorkspace: 'recruiter',
        })
      )
    ).toBe('/onboarding/recruiter')
  })

  it('redirects recruiter routes without org permission to org onboarding', () => {
    expect(
      resolveAppRoute(
        ctx({
          pathname: '/admin',
          preferredWorkspace: 'recruiter',
          orgId: 'org_test',
          canAccessRecruiter: false,
        })
      )
    ).toBe('/onboarding/recruiter')
  })

  it('auto-redirects completed onboarding away from /onboarding', () => {
    expect(
      resolveAppRoute(
        ctx({
          pathname: '/onboarding',
          preferredWorkspace: 'candidate',
        })
      )
    ).toBe('/candidate')
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

    expect(
      resolveAppRoute(
        ctx({
          pathname: '/',
          preferredWorkspace: null,
        })
      )
    ).toBeNull()

    expect(
      resolveAppRoute(
        ctx({
          pathname: '/',
          preferredWorkspace: 'recruiter',
          orgId: 'org_test',
          canAccessRecruiter: true,
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
