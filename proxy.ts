import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { hasClerkServerCredentials } from '@/lib/clerk/config'

const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isAppShellRoute = createRouteMatcher(['/video-demo(.*)', '/write-up(.*)'])
const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])
const hasClerk = hasClerkServerCredentials()

export default hasClerk
  ? clerkMiddleware(async (auth, req) => {
      const { userId } = await auth()
      const isProtectedRoute = isAdminRoute(req) || isAppShellRoute(req)

      if (isProtectedRoute) {
        await auth.protect()
      }

      if (userId && isAuthRoute(req)) {
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
