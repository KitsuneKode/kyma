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

/** Only allow same-origin relative paths to prevent open redirects. */
export function parseRedirectUrl(
  value: string | string[] | undefined | null
): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
    return null
  }
  return raw
}

export function workspaceIntentSearchParam(intent: WorkspaceIntent) {
  return `workspace=${intent}`
}

function appendSearchParam(path: string, key: string, value: string) {
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}${key}=${encodeURIComponent(value)}`
}

export function authContinuePath(
  intent?: WorkspaceIntent | null,
  redirectUrl?: string | null
) {
  let path = '/auth/continue'
  if (intent) {
    path = appendSearchParam(path, 'workspace', intent)
  }
  if (redirectUrl) {
    path = appendSearchParam(path, 'redirect_url', redirectUrl)
  }
  return path
}

export function postAuthRedirectPath(
  intent: WorkspaceIntent | null | undefined,
  redirectUrl: string | null | undefined
) {
  return redirectUrl ?? authContinuePath(intent)
}

export function signInPath(intent?: WorkspaceIntent | null) {
  if (!intent) {
    return '/sign-in'
  }
  return `/sign-in/${intent}`
}

export function signUpPath(intent?: WorkspaceIntent | null) {
  if (!intent) {
    return '/sign-up'
  }
  return `/sign-up/${intent}`
}
