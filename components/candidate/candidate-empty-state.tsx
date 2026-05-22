import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CandidateEmptyState({
  title = 'No interviews linked yet',
  description = 'If your recruiter sent an invite, open that link while signed in with the same email. Kyma will attach the interview to this dashboard automatically.',
}: {
  title?: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-[2rem] bg-card p-10 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
      <div className="space-y-2">
        <p className="text-base font-medium">{title}</p>
        <p className="max-w-md text-sm text-pretty text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
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
      </div>
    </div>
  )
}
