import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { roleFromSessionClaims } from '@/lib/auth/clerk-role'
import { hasClerkServerCredentials } from '@/lib/clerk/config'

const isRecruiterRoute = createRouteMatcher(['/recruiter(.*)'])
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
      const { userId, sessionClaims } = await auth()
      const role = roleFromSessionClaims(
        sessionClaims as Record<string, unknown> | null | undefined
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
        if (role === 'recruiter' || role === 'admin') {
          return NextResponse.redirect(new URL('/recruiter', req.url))
        }
        if (role === 'candidate') {
          return NextResponse.redirect(new URL('/candidate', req.url))
        }
        return NextResponse.redirect(new URL('/onboarding', req.url))
      }

      if (isRecruiterRoute(req) && role !== 'recruiter') {
        return NextResponse.redirect(new URL('/candidate', req.url))
      }

      if (isCandidateRoute(req) && userId) {
        if (role == null) {
          return NextResponse.redirect(new URL('/onboarding', req.url))
        }
        if (role === 'recruiter') {
          return NextResponse.redirect(new URL('/recruiter', req.url))
        }
        if (role !== 'candidate' && role !== 'admin') {
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
