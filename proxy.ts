import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import {
  hasLegacyBothPersona,
  RECRUITER_PERMISSION_MAP,
} from '@/lib/auth/clerk-role'
import { resolveAppRoute } from '@/lib/auth/routing'
import {
  resolvePreferredWorkspaceForRouting,
  shouldClearWorkspaceRoutingCookie,
  WORKSPACE_ROUTING_COOKIE_NAME,
} from '@/lib/auth/workspace-routing-cookie'
import { hasClerkServerCredentials } from '@/lib/clerk/config'

const isRecruiterRoute = createRouteMatcher(['/recruiter(.*)', '/admin(.*)'])
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
  '/api(.*)',
])
const hasClerk = hasClerkServerCredentials()
const allowDevPreviewRoutes = process.env.NODE_ENV !== 'production'

export default hasClerk
  ? clerkMiddleware(async (auth, req) => {
      const { userId, sessionClaims, has, orgId } = await auth()
      const sessionClaimsRecord = sessionClaims as
        | Record<string, unknown>
        | null
        | undefined
      const routingCookie = req.cookies.get(
        WORKSPACE_ROUTING_COOKIE_NAME
      )?.value
      const preferredWorkspace = resolvePreferredWorkspaceForRouting({
        sessionClaims: sessionClaimsRecord,
        routingCookie,
      })
      const hasLegacyBoth = hasLegacyBothPersona(sessionClaimsRecord)
      const canAccessRecruiter = Boolean(
        orgId &&
        (has?.({ role: 'org:admin' }) ||
          has?.({ permission: RECRUITER_PERMISSION_MAP['recruiter:access'] }))
      )

      const isProtectedRoute =
        (!isPublicRoute(req) &&
          !(allowDevPreviewRoutes && isDevPreviewRoute(req))) ||
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
        const response = NextResponse.redirect(new URL(redirectTarget, req.url))
        if (
          shouldClearWorkspaceRoutingCookie({
            sessionClaims: sessionClaimsRecord,
            routingCookie,
          })
        ) {
          response.cookies.delete(WORKSPACE_ROUTING_COOKIE_NAME)
        }
        return response
      }

      if (
        shouldClearWorkspaceRoutingCookie({
          sessionClaims: sessionClaimsRecord,
          routingCookie,
        })
      ) {
        const response = NextResponse.next()
        response.cookies.delete(WORKSPACE_ROUTING_COOKIE_NAME)
        return response
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
