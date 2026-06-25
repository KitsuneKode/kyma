'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useConvexAuth } from 'convex/react'

import { AuthSetupRequired } from '@/components/auth/auth-setup-required'
import { ConvexAuthSetupPanel } from '@/components/auth/convex-auth-setup-panel'
import { PageSkeleton } from '@/components/admin/page-skeleton'
import { Button } from '@/components/ui/button'
import { WorkspaceEmptyState } from '@/components/workspace/empty-state'
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
      <WorkspaceEmptyState
        eyebrow="Workspace access"
        title="Sign in required"
        description="Sign in again to continue. Your session is not active in this workspace."
        action={
          <Button nativeButton={false} render={<Link href={signInHref} />}>
            Sign in
          </Button>
        }
      />
    )
  }

  if (state.kind === 'auth-unavailable') {
    return (
      <div className="space-y-6">
        <WorkspaceEmptyState
          eyebrow="Workspace access"
          title="Backend auth is not ready"
          description="Clerk signed you in, but Convex did not receive a valid JWT. Refresh your session after syncing Clerk and Convex auth configuration."
          action={
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => {
                  window.location.reload()
                }}
              >
                Retry
              </Button>
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href="/dev" />}
              >
                Open dev setup
              </Button>
            </div>
          }
        />
        <ConvexAuthSetupPanel />
      </div>
    )
  }

  return <PageSkeleton />
}
