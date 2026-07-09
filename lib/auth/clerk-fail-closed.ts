/**
 * Fail-closed auth policy when Clerk credentials are missing.
 *
 * Local/dev may passthrough without Clerk (public candidate flows, setup UX).
 * Production must deny auth-gated surfaces instead of silently opening them.
 */

export function mustFailClosedWithoutClerk(options: {
  hasClerk: boolean
  isProduction: boolean
}) {
  return options.isProduction && !options.hasClerk
}

/**
 * Pathnames that must not be reachable without Clerk in production.
 * Mirrors the auth-gated families in `proxy.ts` (recruiter, candidate, shell).
 */
export function isAuthGatedPathWithoutClerk(pathname: string) {
  const path =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname

  if (path === '/recruiter' || path.startsWith('/recruiter/')) {
    return true
  }
  if (path === '/admin' || path.startsWith('/admin/')) {
    return true
  }
  if (path === '/candidate' || path.startsWith('/candidate/')) {
    return true
  }
  if (path === '/onboarding' || path.startsWith('/onboarding/')) {
    return true
  }
  if (path === '/write-up' || path.startsWith('/write-up/')) {
    return true
  }
  if (path === '/settings' || path.startsWith('/settings/')) {
    return true
  }
  if (path === '/auth/continue' || path.startsWith('/auth/continue/')) {
    return true
  }
  if (path.startsWith('/join/')) {
    return true
  }

  return false
}

export const CLERK_UNCONFIGURED_PRODUCTION_MESSAGE =
  'Authentication is not configured for this deployment. Protected routes are unavailable until Clerk credentials are set.'
