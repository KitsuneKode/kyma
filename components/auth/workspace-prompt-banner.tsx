import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { signUpPath } from '@/lib/auth/workspace-intent'
import { cn } from '@/lib/utils'

type WorkspacePromptBannerProps = {
  variant: 'candidate-default' | 'recruiter-setup'
}

export function WorkspacePromptBanner({ variant }: WorkspacePromptBannerProps) {
  if (variant === 'recruiter-setup') {
    return (
      <aside className="mb-6 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
        <p className="text-sm font-medium">Finish recruiter workspace setup</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create or join an organization to access screenings, templates, and
          candidate review.
        </p>
        <Link
          href="/onboarding/recruiter"
          className={cn(buttonVariants({ size: 'sm' }), 'mt-3 inline-flex')}
        >
          Set up organization
        </Link>
      </aside>
    )
  }

  return (
    <aside className="mb-6 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
      <p className="text-sm font-medium">You are in the candidate workspace</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Open the invite link from your recruiter while signed in here. Need to
        run a team?{' '}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href={signUpPath('recruiter')}
        >
          Switch to recruiter setup
        </Link>
      </p>
    </aside>
  )
}
