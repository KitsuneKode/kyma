import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { WorkspaceEmptyState } from '@/components/workspace/empty-state'
import { signInPath } from '@/lib/auth/workspace-intent'

type RecruiterReviewAccessPanelProps = {
  failureKind: 'auth' | 'forbidden' | 'not_found' | 'unknown'
  failureMessage?: string
}

export function RecruiterReviewAccessPanel({
  failureKind,
  failureMessage,
}: RecruiterReviewAccessPanelProps) {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <WorkspaceEmptyState
        eyebrow="Recruiter review"
        title={
          failureKind === 'auth'
            ? 'Sign in required'
            : failureKind === 'not_found'
              ? 'Candidate session not found'
              : 'Unable to load review'
        }
        description={
          failureKind === 'not_found'
            ? 'The session id may be invalid, or Convex is not configured in this environment.'
            : (failureMessage ??
              'Your session may have expired or you may not have access to this organization.')
        }
        action={
          failureKind === 'auth' ? (
            <Button
              nativeButton={false}
              render={<Link href={signInPath('recruiter')} />}
            >
              Sign in again
            </Button>
          ) : (
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/recruiter/candidates" />}
            >
              Back to candidates
            </Button>
          )
        }
      />
    </main>
  )
}
