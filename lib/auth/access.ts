import { cache } from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import {
  clerkHasCapability,
  preferredWorkspaceFromSessionClaims,
  resolveRecruiterAccess,
  type PreferredWorkspace,
  type RecruiterCapability,
} from '@/lib/auth/clerk-role'
import {
  getPostSignInPathFromContext,
  resolveAppRoute,
  type AppRouteContext,
} from '@/lib/auth/routing'

export type UserAppAccess = {
  isSignedIn: boolean
  preferredWorkspace: PreferredWorkspace | 'anonymous' | 'unassigned'
  orgId: string | null
  canAccessRecruiter: boolean
  isOrgAdmin: boolean
}

async function getUserAppAccessUncached(): Promise<UserAppAccess> {
  const { userId, sessionClaims, has, orgId } = await auth()

  if (!userId) {
    return {
      isSignedIn: false,
      preferredWorkspace: 'anonymous',
      orgId: null,
      canAccessRecruiter: false,
      isOrgAdmin: false,
    }
  }

  const preferredWorkspace =
    preferredWorkspaceFromSessionClaims(
      sessionClaims as Record<string, unknown> | null | undefined
    ) ?? 'unassigned'

  const { canAccessRecruiter, isOrgAdmin } = resolveRecruiterAccess({
    orgId,
    has,
  })

  return {
    isSignedIn: true,
    preferredWorkspace,
    orgId: orgId ?? null,
    canAccessRecruiter,
    isOrgAdmin,
  }
}

export const getUserAppAccess = cache(getUserAppAccessUncached)

function toRouteContext(
  access: UserAppAccess,
  pathname: string
): AppRouteContext {
  return {
    pathname,
    isSignedIn: access.isSignedIn,
    preferredWorkspace:
      access.preferredWorkspace === 'anonymous' ||
      access.preferredWorkspace === 'unassigned'
        ? null
        : access.preferredWorkspace,
    orgId: access.orgId,
    canAccessRecruiter: access.canAccessRecruiter,
  }
}

export function getPostSignInPath(access: UserAppAccess): string {
  return getPostSignInPathFromContext(toRouteContext(access, '/'))
}

export async function requireAdminOrRecruiterPageAccess() {
  return await requireRecruiterPageAccess()
}

export async function requireOrgPermission(
  capability: RecruiterCapability
): Promise<UserAppAccess> {
  const access = await getUserAppAccess()
  if (!access.isSignedIn) {
    redirect('/sign-in')
  }
  const target = resolveAppRoute(toRouteContext(access, '/recruiter'))
  if (target) {
    redirect(target)
  }
  const { has } = await auth()
  if (!clerkHasCapability(has, capability)) {
    if (!access.orgId) {
      redirect('/recruiter/setup')
    }
    redirect('/candidate')
  }
  return access
}

export async function requireRecruiterPageAccess() {
  return await requireOrgPermission('recruiter:access')
}

export async function requireAdminPageAccess() {
  const access = await requireRecruiterPageAccess()
  if (!access.isOrgAdmin) {
    redirect('/recruiter')
  }
  return access
}

export async function requireCandidatePageAccess() {
  const access = await getUserAppAccess()
  if (!access.isSignedIn) {
    redirect('/sign-in')
  }
  const target = resolveAppRoute(toRouteContext(access, '/candidate'))
  if (target) {
    redirect(target)
  }
  return access
}
