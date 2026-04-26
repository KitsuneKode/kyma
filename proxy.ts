import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { hasClerkServerCredentials } from '@/lib/clerk/config'

const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isDashboardRoute = createRouteMatcher(['/dashboard(.*)'])
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
      const role = ((sessionClaims?.metadata as { role?: string } | undefined)
        ?.role ?? null) as 'admin' | 'recruiter' | 'candidate' | null
      const isProtectedRoute =
        !isPublicRoute(req) ||
        isAdminRoute(req) ||
        isDashboardRoute(req) ||
        isAppShellRoute(req)

      if (isProtectedRoute) {
        await auth.protect()
      }

      if (userId && isAuthRoute(req)) {
        if (role === 'admin' || role === 'recruiter') {
          return NextResponse.redirect(new URL('/admin', req.url))
        }
        if (role === 'candidate') {
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
        return NextResponse.redirect(new URL('/onboarding', req.url))
      }

      if (isAdminRoute(req) && role !== 'admin' && role !== 'recruiter') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }

      if (
        isDashboardRoute(req) &&
        role !== 'candidate' &&
        role !== 'admin' &&
        role !== 'recruiter'
      ) {
        return NextResponse.redirect(new URL('/admin', req.url))
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
