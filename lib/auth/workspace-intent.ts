import type { PreferredWorkspace } from '@/lib/auth/clerk-role'

export type WorkspaceIntent = PreferredWorkspace

export function parseWorkspaceIntent(
  value: string | string[] | undefined | null
): WorkspaceIntent | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === 'candidate' || raw === 'recruiter') {
    return raw
  }
  return null
}

export function workspaceIntentSearchParam(intent: WorkspaceIntent) {
  return `workspace=${intent}`
}

export function authContinuePath(intent?: WorkspaceIntent | null) {
  if (!intent) {
    return '/auth/continue'
  }
  return `/auth/continue?${workspaceIntentSearchParam(intent)}`
}

export function signInPath(intent?: WorkspaceIntent | null) {
  if (!intent) {
    return '/sign-in'
  }
  return `/sign-in?${workspaceIntentSearchParam(intent)}`
}

export function signUpPath(intent?: WorkspaceIntent | null) {
  if (!intent) {
    return '/sign-up'
  }
  return `/sign-up?${workspaceIntentSearchParam(intent)}`
}
