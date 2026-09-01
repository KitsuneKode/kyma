import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { type NextRequest, NextResponse } from 'next/server'

import {
  CLERK_UNCONFIGURED_PRODUCTION_MESSAGE,
  isAuthGatedPathWithoutClerk,
  mustFailClosedWithoutClerk,
} from '@/lib/auth/clerk-fail-closed'
import {
  preferredWorkspaceFromSessionClaims,
  resolveRecruiterAccess,
} from '@/lib/auth/clerk-role'
import { resolveAppRoute } from '@/lib/auth/routing'
import { hasClerkServerCredentials } from '@/lib/clerk/config'
import { isProductionDeployment } from '@/lib/env/deployment-mode'

const isRecruiterRoute = createRouteMatcher(['/recruiter(.*)', '/admin(.*)'])
const isRecruiterSetupRoute = createRouteMatcher(['/recruiter/setup(.*)'])
const isCandidateRoute = createRouteMatcher(['/candidate(.*)'])
const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)'])
const isAppShellRoute = createRouteMatcher(['/write-up(.*)', '/settings(.*)'])
const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])
const isDevPreviewRoute = createRouteMatcher(['/dev(.*)'])
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/interviews(.*)',
  '/i(.*)',
  '/api(.*)',
])
const hasClerk = hasClerkServerCredentials()
const isProdDeployment = isProductionDeployment({
  deploymentEnv: process.env.KYMA_DEPLOYMENT_ENV,
  nodeEnv: process.env.NODE_ENV,
})
const failClosedWithoutClerk = mustFailClosedWithoutClerk({
  hasClerk,
  isProduction: isProdDeployment,
})

function denyUnconfiguredAuth() {
  return new NextResponse(CLERK_UNCONFIGURED_PRODUCTION_MESSAGE, {
    status: 503,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}

export default hasClerk
  ? clerkMiddleware(async (auth, req) => {
      const { userId, sessionClaims, has, orgId } = await auth()
      const sessionClaimsRecord = sessionClaims as
        | Record<string, unknown>
        | null
        | undefined
      const preferredWorkspace =
        preferredWorkspaceFromSessionClaims(sessionClaimsRecord)
      const { canAccessRecruiter } = resolveRecruiterAccess({ orgId, has })

      const isProtectedRoute =
        (!isPublicRoute(req) &&
          !(!isProdDeployment && isDevPreviewRoute(req))) ||
        isRecruiterRoute(req) ||
        isCandidateRoute(req) ||
        isOnboardingRoute(req) ||
        isAppShellRoute(req)

      if (isProtectedRoute) {
        await auth.protect()
      }

      if (!userId) {
        return
      }

      const pathname = req.nextUrl.pathname

      if (pathname === '/admin' || pathname.startsWith('/admin/')) {
        const recruiterPath =
          pathname === '/admin'
            ? '/recruiter'
            : `/recruiter${pathname.slice('/admin'.length)}`
        return NextResponse.redirect(new URL(recruiterPath, req.url))
      }

      if (isRecruiterRoute(req) && !isRecruiterSetupRoute(req)) {
        if (!orgId || !canAccessRecruiter) {
          return NextResponse.redirect(new URL('/recruiter/setup', req.url))
        }
      }

      const redirectTarget = resolveAppRoute({
        pathname,
        isSignedIn: true,
        preferredWorkspace,
        orgId: orgId ?? null,
        canAccessRecruiter,
      })

      const shouldResolve =
        isAuthRoute(req) ||
        isRecruiterRoute(req) ||
        isCandidateRoute(req) ||
        isOnboardingRoute(req)

      if (shouldResolve && redirectTarget && redirectTarget !== pathname) {
        return NextResponse.redirect(new URL(redirectTarget, req.url))
      }
    })
  : function proxy(req: NextRequest) {
      // Local/dev without Clerk may still passthrough for public candidate flows.
      // Production must fail closed on auth-gated routes.
      if (
        failClosedWithoutClerk &&
        isAuthGatedPathWithoutClerk(req.nextUrl.pathname)
      ) {
        return denyUnconfiguredAuth()
      }
      return NextResponse.next()
    }

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
