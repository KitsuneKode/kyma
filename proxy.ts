import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import {
  personaFromSessionClaims,
  RECRUITER_PERMISSION_MAP,
} from '@/lib/auth/clerk-role'
import { hasClerkServerCredentials } from '@/lib/clerk/config'

const isRecruiterRoute = createRouteMatcher(['/recruiter(.*)', '/admin(.*)'])
const isCandidateRoute = createRouteMatcher(['/candidate(.*)'])
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
      const persona = personaFromSessionClaims(
        sessionClaims as Record<string, unknown> | null | undefined
      )
      const canAccessRecruiter = Boolean(
        orgId &&
        (has?.({ role: 'org:admin' }) ||
          has?.({ permission: RECRUITER_PERMISSION_MAP['recruiter:access'] }))
      )
      const isProtectedRoute =
        !isPublicRoute(req) ||
        isRecruiterRoute(req) ||
        isCandidateRoute(req) ||
        isAppShellRoute(req)

      if (isProtectedRoute) {
        await auth.protect()
      }

      if (userId && isAuthRoute(req)) {
        if (persona === 'recruiter' && canAccessRecruiter) {
          return NextResponse.redirect(new URL('/recruiter', req.url))
        }
        if (persona === 'both' && canAccessRecruiter) {
          return NextResponse.redirect(new URL('/recruiter', req.url))
        }
        if (persona === 'candidate' || persona === 'both') {
          return NextResponse.redirect(new URL('/candidate', req.url))
        }
        return NextResponse.redirect(new URL('/onboarding', req.url))
      }

      if (isRecruiterRoute(req)) {
        if (!orgId) {
          return NextResponse.redirect(
            new URL('/onboarding/recruiter', req.url)
          )
        }
        if (!canAccessRecruiter) {
          return NextResponse.redirect(new URL('/candidate', req.url))
        }
      }

      if (isCandidateRoute(req) && userId) {
        if (persona == null) {
          return NextResponse.redirect(new URL('/onboarding', req.url))
        }
        if (persona === 'recruiter' && canAccessRecruiter) {
          return NextResponse.redirect(new URL('/recruiter', req.url))
        }
        if (persona !== 'candidate' && persona !== 'both') {
          return NextResponse.redirect(new URL('/onboarding', req.url))
        }
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
