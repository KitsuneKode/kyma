import type { PreferredWorkspace } from '@/lib/auth/clerk-role'
import { preferredWorkspaceFromSessionClaims } from '@/lib/auth/clerk-role'

export const WORKSPACE_ROUTING_COOKIE_NAME = 'kyma_workspace_routing'

/** Short-lived bridge until Clerk session JWT picks up publicMetadata changes. */
export const WORKSPACE_ROUTING_COOKIE_MAX_AGE_SECONDS = 300

export function parseWorkspaceRoutingCookie(
  value: string | undefined | null
): PreferredWorkspace | null {
  if (value === 'candidate' || value === 'recruiter') {
    return value
  }
  return null
}

export function resolvePreferredWorkspaceForRouting(args: {
  sessionClaims: Record<string, unknown> | null | undefined
  routingCookie: string | undefined | null
}): PreferredWorkspace | null {
  const fromSession = preferredWorkspaceFromSessionClaims(args.sessionClaims)
  if (fromSession) {
    return fromSession
  }
  return parseWorkspaceRoutingCookie(args.routingCookie)
}

export function shouldClearWorkspaceRoutingCookie(args: {
  sessionClaims: Record<string, unknown> | null | undefined
  routingCookie: string | undefined | null
}): boolean {
  const fromSession = preferredWorkspaceFromSessionClaims(args.sessionClaims)
  const fromCookie = parseWorkspaceRoutingCookie(args.routingCookie)
  return Boolean(fromSession && fromCookie && fromSession === fromCookie)
}

export async function readWorkspaceRoutingCookie(): Promise<PreferredWorkspace | null> {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return parseWorkspaceRoutingCookie(
    cookieStore.get(WORKSPACE_ROUTING_COOKIE_NAME)?.value
  )
}

export async function getPreferredWorkspaceForRouting(args: {
  sessionClaims: Record<string, unknown> | null | undefined
}): Promise<PreferredWorkspace | null> {
  const routingCookie = await readWorkspaceRoutingCookie()
  return resolvePreferredWorkspaceForRouting({
    sessionClaims: args.sessionClaims,
    routingCookie,
  })
}
