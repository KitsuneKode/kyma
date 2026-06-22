import { SignIn, SignUp } from '@clerk/nextjs'
import Link from 'next/link'

import { kymaClerkAppearance } from '@/lib/clerk/appearance'
import type { WorkspaceIntent } from '@/lib/auth/workspace-intent'
import {
  postAuthRedirectPath,
  signInPath,
  signUpPath,
} from '@/lib/auth/workspace-intent'

type ClerkAuthPanelProps = {
  mode: 'sign-in' | 'sign-up'
  intent?: WorkspaceIntent | null
  redirectUrl?: string | null
}

const INTENT_COPY: Record<
  WorkspaceIntent,
  { title: string; description: string }
> = {
  candidate: {
    title: 'Sign in to your interviews',
    description:
      'Track screenings, join live interviews, and review your results.',
  },
  recruiter: {
    title: 'Sign in to your hiring workspace',
    description:
      'Manage screenings, review candidates, and run your recruiting team.',
  },
}

export function ClerkAuthPanel({
  mode,
  intent,
  redirectUrl,
}: ClerkAuthPanelProps) {
  const continueUrl = postAuthRedirectPath(intent, redirectUrl)
  const copy = intent ? INTENT_COPY[intent] : null

  const signInUrl = signInPath(intent)
  const signUpUrl = signUpPath(intent)

  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Kyma
        </p>
        <h1 className="text-xl font-semibold tracking-tight">
          {copy?.title ??
            (mode === 'sign-in' ? 'Sign in to Kyma' : 'Create your account')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {copy?.description ??
            'One account for candidate interviews and recruiter operations.'}
        </p>
      </header>

      {mode === 'sign-in' ? (
        <SignIn
          appearance={kymaClerkAppearance}
          forceRedirectUrl={continueUrl}
          fallbackRedirectUrl={continueUrl}
          signUpUrl={signUpUrl}
        />
      ) : (
        <SignUp
          appearance={kymaClerkAppearance}
          forceRedirectUrl={continueUrl}
          fallbackRedirectUrl={continueUrl}
          signInUrl={signInUrl}
        />
      )}

      <nav className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
        {intent !== 'candidate' ? (
          <Link
            className="underline-offset-4 hover:text-foreground hover:underline"
            href={
              mode === 'sign-in'
                ? signInPath('candidate')
                : signUpPath('candidate')
            }
          >
            I am a candidate
          </Link>
        ) : null}
        {intent !== 'recruiter' ? (
          <Link
            className="underline-offset-4 hover:text-foreground hover:underline"
            href={
              mode === 'sign-in'
                ? signInPath('recruiter')
                : signUpPath('recruiter')
            }
          >
            I am hiring / recruiting
          </Link>
        ) : null}
        {intent ? (
          <Link
            className="underline-offset-4 hover:text-foreground hover:underline"
            href={mode === 'sign-in' ? '/sign-in' : '/sign-up'}
          >
            General sign {mode === 'sign-in' ? 'in' : 'up'}
          </Link>
        ) : null}
      </nav>
    </div>
  )
}
