import Link from 'next/link'

import { CandidateMockInterviewButton } from '@/components/candidate/candidate-mock-interview-button'
import { buttonVariants } from '@/components/ui/button'
import { WorkspaceEmptyState } from '@/components/workspace/empty-state'
import { cn } from '@/lib/utils'

export function CandidateEmptyState({
  title = 'No interviews yet',
  description = 'Your recruiter will send a personal screening link. Open that invite while signed in with the invited email — Kyma links the interview here automatically once you start.',
}: {
  title?: string
  description?: string
}) {
  return (
    <WorkspaceEmptyState
      centered
      title={title}
      description={description}
      action={
        <>
          <Link href="/candidate/readiness" className={cn(buttonVariants())}>
            Run readiness check
          </Link>
          <Link
            href="/candidate/profile"
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            Profile settings
          </Link>
          <CandidateMockInterviewButton />
        </>
      }
    />
  )
}
