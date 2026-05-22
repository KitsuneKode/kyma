import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import {
  hasLegacyBothPersona,
  preferredWorkspaceFromSessionClaims,
  RECRUITER_PERMISSION_MAP,
} from '@/lib/auth/clerk-role'
import { resolveAppRoute } from '@/lib/auth/routing'
import { hasClerkServerCredentials } from '@/lib/clerk/config'

const isRecruiterRoute = createRouteMatcher(['/recruiter(.*)', '/admin(.*)'])
const isCandidateRoute = createRouteMatcher(['/candidate(.*)'])
const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)'])
const isAppShellRoute = createRouteMatcher([
  '/video-demo(.*)',
  '/write-up(.*)',
  '/settings(.*)',
])
const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/interviews(.*)',
  '/api(.*)',
])
const hasClerk = hasClerkServerCredentials()

export default hasClerk
  ? clerkMiddleware(async (auth, req) => {
      const { userId, sessionClaims, has, orgId } = await auth()
      const sessionClaimsRecord = sessionClaims as
        | Record<string, unknown>
        | null
        | undefined
      const preferredWorkspace =
        preferredWorkspaceFromSessionClaims(sessionClaimsRecord)
      const hasLegacyBoth = hasLegacyBothPersona(sessionClaimsRecord)
      const canAccessRecruiter = Boolean(
        orgId &&
        (has?.({ role: 'org:admin' }) ||
          has?.({ permission: RECRUITER_PERMISSION_MAP['recruiter:access'] }))
      )

      const isProtectedRoute =
        !isPublicRoute(req) ||
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
      const redirectTarget = resolveAppRoute({
        pathname,
        isSignedIn: true,
        preferredWorkspace,
        hasLegacyBoth,
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
  : function proxy() {
      return NextResponse.next()
    }

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
