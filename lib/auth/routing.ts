import type { PreferredWorkspace } from '@/lib/auth/clerk-role'
import { authContinuePath } from '@/lib/auth/workspace-intent'

export type AppRouteContext = {
  pathname: string
  isSignedIn: boolean
  preferredWorkspace: PreferredWorkspace | null
  orgId: string | null
  canAccessRecruiter: boolean
}

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }
  return pathname
}

function isAuthPath(pathname: string) {
  return (
    pathname === '/sign-in' ||
    pathname.startsWith('/sign-in/') ||
    pathname === '/sign-up' ||
    pathname.startsWith('/sign-up/')
  )
}

function workspaceIntentFromAuthPath(
  pathname: string
): PreferredWorkspace | null {
  if (pathname === '/sign-in/recruiter' || pathname === '/sign-up/recruiter') {
    return 'recruiter'
  }
  if (pathname === '/sign-in/candidate' || pathname === '/sign-up/candidate') {
    return 'candidate'
  }
  return null
}

function isRecruiterPath(pathname: string) {
  return pathname === '/recruiter' || pathname.startsWith('/recruiter/')
}

function isCandidatePath(pathname: string) {
  return pathname === '/candidate' || pathname.startsWith('/candidate/')
}

function isJoinPath(pathname: string) {
  return pathname.startsWith('/join/')
}

function isLegacyOnboardingPath(pathname: string) {
  return pathname === '/onboarding' || pathname.startsWith('/onboarding/')
}

function recruiterHome(ctx: Omit<AppRouteContext, 'pathname'>) {
  if (ctx.orgId && ctx.canAccessRecruiter) {
    return '/recruiter'
  }
  return '/recruiter/setup'
}

export function getPostSignInPathFromContext(
  ctx: Omit<AppRouteContext, 'pathname'>
): string {
  if (!ctx.isSignedIn) {
    return '/sign-in'
  }

  if (ctx.preferredWorkspace === 'recruiter') {
    return recruiterHome(ctx)
  }

  if (ctx.preferredWorkspace === 'candidate') {
    return '/candidate'
  }

  return authContinuePath()
}

/**
 * Returns a redirect target when the current path should not be shown, or null to continue.
 */
export function resolveAppRoute(ctx: AppRouteContext): string | null {
  if (!ctx.isSignedIn) {
    return null
  }

  const pathname = normalizePathname(ctx.pathname)

  if (pathname === '/auth/continue') {
    return null
  }

  if (pathname === '/') {
    return null
  }

  if (isLegacyOnboardingPath(pathname)) {
    if (pathname === '/onboarding/recruiter') {
      return '/recruiter/setup'
    }
    if (ctx.preferredWorkspace === 'candidate') {
      return '/candidate'
    }
    if (ctx.preferredWorkspace === 'recruiter') {
      return recruiterHome(ctx)
    }
    return '/auth/continue'
  }

  if (isAuthPath(pathname)) {
    const target = ctx.preferredWorkspace
      ? getPostSignInPathFromContext(ctx)
      : authContinuePath(workspaceIntentFromAuthPath(pathname))
    if (target === pathname) {
      return null
    }
    return target
  }

  if (isRecruiterPath(pathname)) {
    if (pathname === '/recruiter/setup') {
      if (ctx.orgId && ctx.canAccessRecruiter) {
        return '/recruiter'
      }
      return null
    }
    if (!ctx.orgId || !ctx.canAccessRecruiter) {
      return '/recruiter/setup'
    }
    return null
  }

  if (isCandidatePath(pathname)) {
    return null
  }

  if (isJoinPath(pathname)) {
    return null
  }

  return null
}
