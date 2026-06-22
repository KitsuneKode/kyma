import Link from 'next/link'

import { signInPath, signUpPath } from '@/lib/auth/workspace-intent'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const pressable =
  'min-h-[44px] min-w-[44px] rounded-xl transition-[transform,background-color] duration-150 ease-out active:scale-[0.96]'

type MarketingDualPathwayCardsProps = {
  className?: string
}

export function MarketingDualPathwayCards({
  className,
}: MarketingDualPathwayCardsProps) {
  return (
    <div
      className={cn(
        'mx-auto grid max-w-4xl gap-6 text-left md:grid-cols-2',
        className
      )}
    >
      <div className="flex h-full flex-col rounded-2xl border border-primary/30 bg-card/80 p-6 shadow-[var(--shadow-sm)] ring-1 ring-primary/20">
        <p className="text-xs font-semibold tracking-[0.14em] text-foreground/80 uppercase">
          For hiring teams
        </p>
        <p className="mt-2 flex-1 text-sm text-pretty text-muted-foreground">
          Screenings, review queue, tutor rubric, and evidence-backed decisions
          in one workspace.
        </p>
        <div className="mt-6">
          <Button
            size="lg"
            className={cn(pressable, 'w-full px-8 text-base shadow-inner')}
            render={<Link href={signUpPath('recruiter')} />}
            nativeButton={false}
          >
            Start screening tutors
          </Button>
        </div>
        <p className="mt-4 border-t border-border/40 pt-4 text-sm text-muted-foreground">
          <Link
            href={signInPath('recruiter')}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Recruiter sign in
          </Link>
        </p>
      </div>

      <div className="flex h-full flex-col rounded-2xl border border-border/40 bg-card/50 p-6 ring-1 ring-border/30">
        <p className="text-xs font-semibold tracking-[0.14em] text-foreground/80 uppercase">
          Candidate experience
        </p>
        <p className="mt-2 flex-1 text-sm text-pretty text-muted-foreground">
          Walk the live interview exactly as a tutor would, before you send a
          single invite.
        </p>
        <div className="mt-6">
          <Button
            size="lg"
            variant="outline"
            className={cn(
              pressable,
              'h-12 w-full px-8 text-base ring-1 ring-border/40 hover:bg-muted/30'
            )}
            render={<Link href="/interviews/demo-invite" />}
            nativeButton={false}
          >
            Try the candidate flow
          </Button>
        </div>
        <p className="mt-4 border-t border-border/40 pt-4 text-sm text-muted-foreground">
          <Link
            href={signInPath('candidate')}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Candidate sign in
          </Link>
          <span className="mx-1.5 text-border">·</span>
          <Link
            href={signUpPath('candidate')}
            className="font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
          >
            Create account
          </Link>
        </p>
      </div>
    </div>
  )
}
