import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import { roleFromSessionClaims, type AppRole } from '@/lib/auth/clerk-role'

export type UserAppAccess = {
  isSignedIn: boolean
  role: AppRole | 'anonymous' | 'unassigned'
}

export async function getUserAppAccess(): Promise<UserAppAccess> {
  const { userId, sessionClaims } = await auth()

  if (!userId) {
    return { isSignedIn: false, role: 'anonymous' }
  }

  const role = roleFromSessionClaims(
    sessionClaims as Record<string, unknown> | null | undefined
  )

  return {
    isSignedIn: true,
    role: role ?? 'unassigned',
  }
}

export async function requireAdminOrRecruiterPageAccess() {
  const access = await getUserAppAccess()
  if (!access.isSignedIn) {
    redirect('/sign-in')
  }
  if (access.role === 'unassigned') {
    redirect('/onboarding')
  }
  if (access.role !== 'admin' && access.role !== 'recruiter') {
    redirect('/candidate')
  }
  return access
}

export async function requireDashboardPageAccess() {
  const access = await getUserAppAccess()
  if (!access.isSignedIn) {
    redirect('/sign-in')
  }
  if (access.role === 'unassigned') {
    redirect('/onboarding')
  }
  if (access.role === 'recruiter') {
    redirect('/recruiter')
  }
  if (access.role !== 'candidate' && access.role !== 'admin') {
    redirect('/onboarding')
  }
  return access
}

export function getPostSignInPath(access: UserAppAccess): string {
  if (
    !access.isSignedIn ||
    access.role === 'anonymous' ||
    access.role === 'unassigned'
  ) {
    return '/onboarding'
  }
  if (access.role === 'recruiter') {
    return '/recruiter'
  }
  return '/candidate'
}

export async function requireRecruiterPageAccess() {
  const access = await getUserAppAccess()
  if (!access.isSignedIn) {
    redirect('/sign-in')
  }
  if (access.role === 'unassigned') {
    redirect('/onboarding')
  }
  if (access.role !== 'recruiter') {
    redirect('/candidate')
  }
  return access
}

export async function requireCandidatePageAccess() {
  const access = await getUserAppAccess()
  if (!access.isSignedIn) {
    redirect('/sign-in')
  }
  if (access.role === 'unassigned') {
    redirect('/onboarding')
  }
  if (access.role === 'recruiter') {
    redirect('/recruiter')
  }
  if (access.role !== 'candidate' && access.role !== 'admin') {
    redirect('/onboarding')
  }
  return access
}
