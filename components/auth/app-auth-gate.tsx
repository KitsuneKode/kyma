'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useConvexAuth } from 'convex/react'

import { AuthSetupRequired } from '@/components/auth/auth-setup-required'
import { ConvexAuthSetupPanel } from '@/components/auth/convex-auth-setup-panel'
import { Button } from '@/components/ui/button'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { resolveAppAuthState } from '@/lib/auth/app-auth-state'
import type { ClerkSetupStatus } from '@/lib/clerk/setup-status'

type AppAuthGateProps = {
  children: ReactNode
  clerkEnabled: boolean
  setupStatus: ClerkSetupStatus
  signInHref?: string
}

export function AppAuthGate({
  children,
  clerkEnabled,
  setupStatus,
  signInHref = '/sign-in',
}: AppAuthGateProps) {
  const { isLoaded, isSignedIn } = useAuth()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const state = resolveAppAuthState({
    clerkEnabled,
    clerkLoaded: isLoaded,
    clerkSignedIn: Boolean(isSignedIn),
    convexConfigured: setupStatus.convexUrlSet,
    convexAuthLoading: isLoading,
    convexAuthenticated: isAuthenticated,
  })

  if (state.kind === 'ready') {
    return <>{children}</>
  }

  if (state.kind === 'setup-required') {
    return (
      <AuthSetupRequired
        missing={setupStatus.missing}
        derivedIssuerDomain={setupStatus.derivedIssuerDomain}
      />
    )
  }

  if (state.kind === 'signed-out') {
    return (
      <WorkspaceSurface className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">Sign in required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in again to continue. Your session is not active in this
            workspace.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href={signInHref} />}>
          Sign in
        </Button>
      </WorkspaceSurface>
    )
  }

  if (state.kind === 'auth-unavailable') {
    return (
      <ConvexAuthSetupPanel
        title="Backend auth is not ready"
        description="Clerk signed you in, but Convex did not receive a valid convex JWT. Refresh your session after syncing Clerk and Convex auth configuration."
      />
    )
  }

  return (
    <WorkspaceSurface className="p-6">
      <p className="text-sm text-muted-foreground">
        Checking your authenticated session…
      </p>
    </WorkspaceSurface>
  )
}
