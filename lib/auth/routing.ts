import type { PreferredWorkspace } from '@/lib/auth/clerk-role'
import { authContinuePath } from '@/lib/auth/workspace-intent'

export type AppRouteContext = {
  pathname: string
  isSignedIn: boolean
  preferredWorkspace: PreferredWorkspace | null
  hasLegacyBoth: boolean
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

function isRecruiterPath(pathname: string) {
  return (
    pathname === '/recruiter' ||
    pathname.startsWith('/recruiter/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/')
  )
}

function isCandidatePath(pathname: string) {
  return pathname === '/candidate' || pathname.startsWith('/candidate/')
}

function isOnboardingPath(pathname: string) {
  return pathname === '/onboarding' || pathname.startsWith('/onboarding/')
}

function recruiterHome(ctx: Omit<AppRouteContext, 'pathname'>) {
  if (ctx.orgId && ctx.canAccessRecruiter) {
    return '/recruiter'
  }
  return '/onboarding/recruiter'
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

  if (ctx.hasLegacyBoth) {
    return recruiterHome(ctx)
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
    const target = getPostSignInPathFromContext(ctx)
    return target === '/' ? null : target
  }

  if (isAuthPath(pathname)) {
    const target = getPostSignInPathFromContext(ctx)
    if (target === pathname) {
      return null
    }
    return target
  }

  if (isRecruiterPath(pathname)) {
    if (!ctx.orgId || !ctx.canAccessRecruiter) {
      return '/onboarding/recruiter'
    }
    return null
  }

  if (isCandidatePath(pathname)) {
    return null
  }

  if (pathname === '/onboarding') {
    if (ctx.preferredWorkspace === 'candidate') {
      return '/candidate'
    }
    if (ctx.preferredWorkspace === 'recruiter') {
      return recruiterHome(ctx)
    }
    if (ctx.hasLegacyBoth) {
      return recruiterHome(ctx)
    }
    return null
  }

  if (pathname === '/onboarding/recruiter') {
    const wantsRecruiter =
      ctx.preferredWorkspace === 'recruiter' || ctx.hasLegacyBoth
    if (!wantsRecruiter) {
      return '/onboarding'
    }
    if (ctx.orgId && ctx.canAccessRecruiter) {
      return '/recruiter'
    }
    return null
  }

  if (isOnboardingPath(pathname)) {
    return null
  }

  return null
}
