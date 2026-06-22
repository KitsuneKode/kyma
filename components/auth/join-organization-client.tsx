'use client'

import { useAuth, useOrganizationList } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { WorkspaceSurface } from '@/components/workspace/surface'

export function JoinOrganizationClient({ orgId }: { orgId: string }) {
  const router = useRouter()
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth()
  const { isLoaded: orgListLoaded, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
    userInvitations: { infinite: true },
  })
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('Preparing your workspace…')

  useEffect(() => {
    if (!authLoaded || !orgListLoaded) {
      return
    }

    if (!isSignedIn) {
      router.replace(
        `/sign-in/recruiter?redirect_url=${encodeURIComponent(`/join/${orgId}`)}`
      )
      return
    }

    let cancelled = false

    async function activateOrganization() {
      try {
        setStatus('Activating organization membership…')
        await setActive?.({ organization: orgId })
        await getToken({ template: 'convex', skipCache: true }).catch(
          () => null
        )
        if (cancelled) return
        router.replace('/recruiter')
        router.refresh()
      } catch (cause) {
        if (cancelled) return
        setError(
          cause instanceof Error
            ? cause.message
            : 'Unable to join this organization.'
        )
      }
    }

    void activateOrganization()

    return () => {
      cancelled = true
    }
  }, [
    authLoaded,
    getToken,
    isSignedIn,
    orgId,
    orgListLoaded,
    router,
    setActive,
  ])

  return (
    <WorkspaceSurface className="mx-auto max-w-lg space-y-4 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Join your team</h1>
      <p className="text-sm text-muted-foreground">
        We are linking your account to the invited organization.
      </p>
      {error ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button type="button" onClick={() => router.push('/recruiter/setup')}>
            Open organization setup
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{status}</p>
      )}
    </WorkspaceSurface>
  )
}
