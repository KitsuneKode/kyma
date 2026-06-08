import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { WorkspaceEmptyState } from '@/components/workspace/empty-state'
import { cn } from '@/lib/utils'

export function CandidateEmptyState({
  title = 'No interviews linked yet',
  description = 'If your recruiter sent an invite, open that link while signed in with the same email. Kyma will attach the interview to this dashboard automatically.',
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
          <Link
            href="/interviews/demo-invite"
            className={cn(buttonVariants({ variant: 'ghost' }))}
          >
            Try demo interview
          </Link>
        </>
      }
    />
  )
}
