'use client'

import { SignIn, SignUp, useAuth } from '@clerk/nextjs'
import { useMutation } from 'convex/react'
import { useEffect, useState, type ReactNode } from 'react'

import { api } from '@/convex/_generated/api'
import { kymaClerkAppearance } from '@/lib/clerk/appearance'
import { Button } from '@/components/ui/button'

type InviteAuthGateProps = {
  inviteToken: string
  candidateName?: string
  disabled?: boolean
  children: ReactNode
}

function inviteReturnPath(inviteToken: string) {
  return `/i/${inviteToken}`
}

export function InviteAuthGate({
  inviteToken,
  candidateName,
  disabled = false,
  children,
}: InviteAuthGateProps) {
  const { isLoaded, isSignedIn } = useAuth()
  const claimInvite = useMutation(
    api.interviews.candidatePortal.claimCandidateInviteByToken
  )
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [claimError, setClaimError] = useState<string | null>(null)
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimReady, setClaimReady] = useState(false)

  const returnUrl = inviteReturnPath(inviteToken)
  const greetingName = candidateName?.trim()

  useEffect(() => {
    if (disabled) {
      return
    }

    if (!isLoaded || !isSignedIn) {
      setClaimReady(false)
      return
    }

    let cancelled = false
    setIsClaiming(true)
    setClaimError(null)

    void claimInvite({ inviteToken })
      .then((result) => {
        if (cancelled) {
          return
        }
        if (!result.linked) {
          setClaimError(
            'This invite could not be linked to your account. Confirm you signed in with the email your recruiter used.'
          )
          setClaimReady(false)
          return
        }
        setClaimReady(true)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }
        setClaimError(
          error instanceof Error
            ? error.message
            : 'Unable to link this invite to your account.'
        )
        setClaimReady(false)
      })
      .finally(() => {
        if (!cancelled) {
          setIsClaiming(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [claimInvite, disabled, inviteToken, isLoaded, isSignedIn])

  if (disabled) {
    return <>{children}</>
  }

  if (!isLoaded) {
    return (
      <div className="mx-auto flex min-h-[50dvh] w-full max-w-lg items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Loading sign-in…</p>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="mx-auto grid min-h-[100dvh] w-full max-w-[1400px] items-center gap-10 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-10">
        <section className="rounded-3xl bg-card/80 p-8 shadow-[var(--shadow-lg)] ring-1 ring-white/10">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Screening invite
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {greetingName
              ? `Hi ${greetingName}, sign in to continue`
              : 'Sign in to start your interview'}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Use the same email address your recruiter invited. Kyma links this
            screening to your account automatically after you sign in.
          </p>
        </section>

        <section className="rounded-3xl bg-card/90 p-6 shadow-[var(--shadow-lg)] ring-1 ring-white/10 sm:p-8">
          <div className="mb-4 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={authMode === 'sign-in' ? 'default' : 'outline'}
              onClick={() => setAuthMode('sign-in')}
            >
              Sign in
            </Button>
            <Button
              type="button"
              size="sm"
              variant={authMode === 'sign-up' ? 'default' : 'outline'}
              onClick={() => setAuthMode('sign-up')}
            >
              Create account
            </Button>
          </div>

          {authMode === 'sign-in' ? (
            <SignIn
              appearance={kymaClerkAppearance}
              routing="hash"
              forceRedirectUrl={returnUrl}
              fallbackRedirectUrl={returnUrl}
              signUpUrl={returnUrl}
            />
          ) : (
            <SignUp
              appearance={kymaClerkAppearance}
              routing="hash"
              forceRedirectUrl={returnUrl}
              fallbackRedirectUrl={returnUrl}
              signInUrl={returnUrl}
            />
          )}
        </section>
      </div>
    )
  }

  if (isClaiming) {
    return (
      <div className="mx-auto flex min-h-[50dvh] w-full max-w-lg items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">
          Linking this invite to your account…
        </p>
      </div>
    )
  }

  if (claimError) {
    return (
      <div className="mx-auto w-full max-w-lg px-6 py-16">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6">
          <p className="text-sm font-medium text-destructive">
            Unable to link invite
          </p>
          <p className="mt-2 text-sm text-destructive/90">{claimError}</p>
          <Button
            type="button"
            className="mt-4"
            variant="outline"
            onClick={() => {
              setClaimError(null)
              setIsClaiming(true)
              void claimInvite({ inviteToken })
                .then((result) => {
                  if (!result.linked) {
                    setClaimError(
                      'This invite could not be linked to your account.'
                    )
                    return
                  }
                  setClaimReady(true)
                })
                .catch((error) => {
                  setClaimError(
                    error instanceof Error
                      ? error.message
                      : 'Unable to link this invite to your account.'
                  )
                })
                .finally(() => {
                  setIsClaiming(false)
                })
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (!claimReady) {
    return (
      <div className="mx-auto flex min-h-[50dvh] w-full max-w-lg items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">
          Preparing your interview…
        </p>
      </div>
    )
  }

  return <>{children}</>
}
