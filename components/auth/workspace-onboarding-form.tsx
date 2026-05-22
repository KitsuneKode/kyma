'use client'

import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import type { PreferredWorkspace } from '@/lib/auth/clerk-role'
import { setPreferredWorkspace } from '@/lib/auth/workspace-actions'

type WorkspaceOnboardingFormProps = {
  className?: string
}

export function WorkspaceOnboardingForm({
  className,
}: WorkspaceOnboardingFormProps) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function choose(workspace: PreferredWorkspace) {
    setError(null)
    startTransition(async () => {
      const result = await setPreferredWorkspace(workspace)
      if (!result.ok) {
        setError(result.error)
        return
      }

      await getToken({ skipCache: true }).catch(() => null)
      router.push(result.redirectTo)
      router.refresh()
    })
  }

  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border p-5">
          <h2 className="font-medium">Candidate workspace</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Join interviews, track outcomes, and continue your personal
            screening journey.
          </p>
          <Button
            type="button"
            className="mt-4 w-full"
            disabled={isPending}
            onClick={() => choose('candidate')}
          >
            Continue to interviews
          </Button>
        </div>

        <div className="rounded-2xl border p-5">
          <h2 className="font-medium">Recruiter workspace</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage screenings, review candidates, and run hiring operations.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full"
            disabled={isPending}
            onClick={() => choose('recruiter')}
          >
            Set up hiring workspace
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {isPending ? (
        <p className="mt-2 text-sm text-muted-foreground">Saving preference…</p>
      ) : null}
    </div>
  )
}
