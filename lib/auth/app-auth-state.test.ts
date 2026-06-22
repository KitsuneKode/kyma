import { describe, expect, it } from 'vitest'

import { resolveAppAuthState } from '@/lib/auth/app-auth-state'

const ready = {
  clerkEnabled: true,
  clerkLoaded: true,
  clerkSignedIn: true,
  convexConfigured: true,
  convexAuthLoading: false,
  convexAuthenticated: true,
}

describe('resolveAppAuthState', () => {
  it('requires auth configuration before checking sessions', () => {
    expect(
      resolveAppAuthState({ ...ready, clerkEnabled: false })
    ).toStrictEqual({ kind: 'setup-required' })
    expect(
      resolveAppAuthState({ ...ready, convexConfigured: false })
    ).toStrictEqual({ kind: 'setup-required' })
  })

  it('waits for Clerk and Convex loading states', () => {
    expect(resolveAppAuthState({ ...ready, clerkLoaded: false })).toStrictEqual(
      { kind: 'loading' }
    )
    expect(
      resolveAppAuthState({ ...ready, convexAuthLoading: true })
    ).toStrictEqual({ kind: 'loading' })
  })

  it('distinguishes signed-out Clerk from unavailable Convex auth', () => {
    expect(
      resolveAppAuthState({ ...ready, clerkSignedIn: false })
    ).toStrictEqual({ kind: 'signed-out' })
    expect(
      resolveAppAuthState({ ...ready, convexAuthenticated: false })
    ).toStrictEqual({ kind: 'auth-unavailable' })
  })

  it('allows protected content only when both auth layers are ready', () => {
    expect(resolveAppAuthState(ready)).toStrictEqual({ kind: 'ready' })
  })
})
