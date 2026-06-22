import { cache } from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import {
  hasLegacyBothPersona,
  RECRUITER_PERMISSION_MAP,
  type PreferredWorkspace,
  type RecruiterCapability,
} from '@/lib/auth/clerk-role'
import {
  getPostSignInPathFromContext,
  resolveAppRoute,
  type AppRouteContext,
} from '@/lib/auth/routing'
import { getPreferredWorkspaceForRouting } from '@/lib/auth/workspace-routing-cookie'

export type UserAppAccess = {
  isSignedIn: boolean
  preferredWorkspace: PreferredWorkspace | 'anonymous' | 'unassigned'
  hasLegacyBoth: boolean
  orgId: string | null
  canAccessRecruiter: boolean
}

async function getUserAppAccessUncached(): Promise<UserAppAccess> {
  const { userId, sessionClaims, has, orgId } = await auth()

  if (!userId) {
    return {
      isSignedIn: false,
      preferredWorkspace: 'anonymous',
      hasLegacyBoth: false,
      orgId: null,
      canAccessRecruiter: false,
    }
  }

  const preferredWorkspace = await getPreferredWorkspaceForRouting({
    sessionClaims: sessionClaims as Record<string, unknown> | null | undefined,
  })
  const canAccessRecruiter = Boolean(
    orgId &&
    (has?.({ role: 'org:admin' }) ||
      has?.({ permission: RECRUITER_PERMISSION_MAP['recruiter:access'] }))
  )

  return {
    isSignedIn: true,
    preferredWorkspace: preferredWorkspace ?? 'unassigned',
    hasLegacyBoth: hasLegacyBothPersona(
      sessionClaims as Record<string, unknown> | null | undefined
    ),
    orgId: orgId ?? null,
    canAccessRecruiter,
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
    hasLegacyBoth: access.hasLegacyBoth,
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
  const allowed = Boolean(
    has?.({ role: 'org:admin' }) ||
    has?.({ permission: RECRUITER_PERMISSION_MAP[capability] })
  )
  if (!allowed) {
    if (!access.orgId) {
      redirect('/onboarding/recruiter')
    }
    redirect('/onboarding/recruiter?setup=jwt')
  }
  return access
}

export async function requireRecruiterPageAccess() {
  return await requireOrgPermission('recruiter:access')
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
