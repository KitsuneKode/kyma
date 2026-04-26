import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import {
  personaFromSessionClaims,
  RECRUITER_PERMISSION_MAP,
  type PersonaHint,
  type RecruiterCapability,
} from '@/lib/auth/clerk-role'

export type UserAppAccess = {
  isSignedIn: boolean
  persona: PersonaHint | 'anonymous' | 'unassigned'
  orgId: string | null
  canAccessRecruiter: boolean
}

export async function getUserAppAccess(): Promise<UserAppAccess> {
  const { userId, sessionClaims, has, orgId } = await auth()

  if (!userId) {
    return {
      isSignedIn: false,
      persona: 'anonymous',
      orgId: null,
      canAccessRecruiter: false,
    }
  }

  const persona = personaFromSessionClaims(
    sessionClaims as Record<string, unknown> | null | undefined
  )
  const canAccessRecruiter = Boolean(
    orgId &&
    (has?.({ role: 'org:admin' }) ||
      has?.({ permission: RECRUITER_PERMISSION_MAP['recruiter:access'] }))
  )

  return {
    isSignedIn: true,
    persona: persona ?? 'unassigned',
    orgId: orgId ?? null,
    canAccessRecruiter,
  }
}

export async function requireAdminOrRecruiterPageAccess() {
  return await requireRecruiterPageAccess()
}

export async function requireDashboardPageAccess() {
  const access = await getUserAppAccess()
  if (!access.isSignedIn) {
    redirect('/sign-in')
  }
  if (access.persona === 'unassigned') {
    redirect('/onboarding')
  }
  if (access.persona === 'recruiter') {
    redirect('/recruiter')
  }
  return access
}

export function getPostSignInPath(access: UserAppAccess): string {
  if (
    !access.isSignedIn ||
    access.persona === 'anonymous' ||
    access.persona === 'unassigned'
  ) {
    return '/onboarding'
  }
  if (access.persona === 'recruiter') {
    if (access.canAccessRecruiter) {
      return '/recruiter'
    }
    return '/onboarding/recruiter'
  }
  if (access.persona === 'both' && access.canAccessRecruiter) {
    return '/recruiter'
  }
  return '/candidate'
}

export async function requireOrgPermission(
  capability: RecruiterCapability
): Promise<UserAppAccess> {
  const access = await getUserAppAccess()
  if (!access.isSignedIn) {
    redirect('/sign-in')
  }
  if (access.persona === 'unassigned') {
    redirect('/onboarding')
  }
  if (!access.orgId) {
    redirect('/onboarding/recruiter')
  }
  const { has } = await auth()
  const allowed = Boolean(
    has?.({ role: 'org:admin' }) ||
    has?.({ permission: RECRUITER_PERMISSION_MAP[capability] })
  )
  if (!allowed) {
    redirect('/candidate')
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
  if (access.persona === 'unassigned') {
    redirect('/onboarding')
  }
  if (access.persona === 'recruiter' && access.canAccessRecruiter) {
    redirect('/recruiter')
  }
  return access
}
