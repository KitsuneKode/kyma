export type AppAuthState =
  | { kind: 'setup-required' }
  | { kind: 'signed-out' }
  | { kind: 'loading' }
  | { kind: 'auth-unavailable' }
  | { kind: 'ready' }

export type ResolveAppAuthStateInput = {
  clerkEnabled: boolean
  clerkLoaded: boolean
  clerkSignedIn: boolean
  convexConfigured: boolean
  convexAuthLoading: boolean
  convexAuthenticated: boolean
}

export function resolveAppAuthState({
  clerkEnabled,
  clerkLoaded,
  clerkSignedIn,
  convexConfigured,
  convexAuthLoading,
  convexAuthenticated,
}: ResolveAppAuthStateInput): AppAuthState {
  if (!clerkEnabled || !convexConfigured) {
    return { kind: 'setup-required' }
  }

  if (!clerkLoaded) {
    return { kind: 'loading' }
  }

  if (!clerkSignedIn) {
    return { kind: 'signed-out' }
  }

  if (convexAuthLoading) {
    return { kind: 'loading' }
  }

  if (!convexAuthenticated) {
    return { kind: 'auth-unavailable' }
  }

  return { kind: 'ready' }
}
