import 'server-only'

import { clerkClient, type User } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'

import type { PreferredWorkspace } from '@/lib/auth/clerk-role'
import {
  WORKSPACE_ROUTING_COOKIE_MAX_AGE_SECONDS,
  WORKSPACE_ROUTING_COOKIE_NAME,
} from '@/lib/auth/workspace-routing-cookie'

function parseWorkspaceFromPublicMetadata(
  metadata: Record<string, unknown> | null | undefined
): PreferredWorkspace | null {
  if (!metadata) return null

  const preferred = metadata.preferredWorkspace
  if (preferred === 'candidate' || preferred === 'recruiter') {
    return preferred
  }

  const legacyPersona = metadata.persona
  if (legacyPersona === 'both') {
    return null
  }
  if (legacyPersona === 'candidate' || legacyPersona === 'recruiter') {
    return legacyPersona
  }

  return null
}

function isClerkRateLimitError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'clerkError' in error &&
    error.clerkError === true &&
    'status' in error &&
    error.status === 429
  )
}

export function preferredWorkspaceFromClerkUser(
  user: User
): PreferredWorkspace | null {
  return parseWorkspaceFromPublicMetadata(
    user.publicMetadata as Record<string, unknown>
  )
}

export async function setWorkspaceRoutingCookie(workspace: PreferredWorkspace) {
  const cookieStore = await cookies()
  cookieStore.set(WORKSPACE_ROUTING_COOKIE_NAME, workspace, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: WORKSPACE_ROUTING_COOKIE_MAX_AGE_SECONDS,
    path: '/',
  })
}

export async function setPreferredWorkspaceHint(
  userId: string,
  workspace: PreferredWorkspace,
  options?: { existing?: PreferredWorkspace | null }
): Promise<{ persisted: boolean }> {
  const existing =
    options?.existing === undefined
      ? await getPreferredWorkspaceFromClerk(userId)
      : options.existing

  if (existing === workspace) {
    return { persisted: false }
  }

  try {
    const client = await clerkClient()
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        preferredWorkspace: workspace,
      },
    })
    return { persisted: true }
  } catch (error) {
    if (isClerkRateLimitError(error)) {
      console.warn(
        'Clerk rate limit when saving workspace preference; continuing with routing cookie'
      )
      return { persisted: false }
    }
    throw error
  }
}

export async function getPreferredWorkspaceFromClerk(
  userId: string
): Promise<PreferredWorkspace | null> {
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  return preferredWorkspaceFromClerkUser(user)
}

export function getRedirectPathAfterWorkspaceChoice(args: {
  workspace: PreferredWorkspace
  orgId: string | null
  canAccessRecruiter: boolean
}): string {
  if (args.workspace === 'recruiter') {
    if (args.orgId && args.canAccessRecruiter) {
      return '/recruiter'
    }
    return '/onboarding/recruiter'
  }
  return '/candidate'
}
