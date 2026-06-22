import Link from 'next/link'
import type { ReactNode } from 'react'

import { signInPath, signUpPath } from '@/lib/auth/workspace-intent'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const pressable =
  'min-h-[44px] min-w-[44px] rounded-xl transition-[transform,background-color] duration-150 ease-out active:scale-[0.96]'

type MarketingCtaRowProps = {
  variant?: 'hero' | 'section'
  className?: string
}

function SecondaryLinkGroup({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  )
}

/**
 * Single source of truth for marketing CTAs.
 * Recruiter signup is primary; candidate paths are secondary utilities.
 */
export function MarketingCtaRow({
  variant = 'section',
  className,
}: MarketingCtaRowProps) {
  const isHero = variant === 'hero'

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        isHero ? 'sm:flex-row sm:flex-wrap' : 'sm:flex-row',
        className
      )}
    >
      <div className="rounded-[calc(var(--radius-xl)+0.125rem)] border border-border/60 bg-muted/20 p-[3px] shadow-sm backdrop-blur-sm">
        <Button
          size="lg"
          className={cn(pressable, 'px-8 text-base shadow-inner')}
          render={<Link href={signUpPath('recruiter')} />}
          nativeButton={false}
        >
          <span className="text-nowrap">Start screening tutors</span>
        </Button>
      </div>
      <Button
        size="lg"
        variant="outline"
        className={cn(
          pressable,
          'h-12 px-8 text-base ring-1 ring-border/40 hover:bg-muted/30'
        )}
        render={<Link href="/interviews/demo-invite" />}
        nativeButton={false}
      >
        <span className="text-nowrap">Try the candidate flow</span>
      </Button>

      {isHero ? (
        <div className="flex w-full flex-col items-center justify-center gap-4 pt-2 sm:flex-row sm:gap-10">
          <SecondaryLinkGroup label="For hiring teams">
            <Link
              href={signInPath('recruiter')}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Recruiter sign in
            </Link>
          </SecondaryLinkGroup>
          <SecondaryLinkGroup label="For candidates">
            <Link
              href={signInPath('candidate')}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
            <span className="mx-1.5 text-border">·</span>
            <Link
              href={signUpPath('candidate')}
              className="font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
            >
              Create account
            </Link>
          </SecondaryLinkGroup>
        </div>
      ) : (
        <p className="w-full text-center text-sm text-muted-foreground sm:w-auto">
          <Link
            href={signInPath('recruiter')}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Recruiter sign in
          </Link>
          <span className="mx-1.5 text-border">·</span>
          <Link
            href={signInPath('candidate')}
            className="font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
          >
            Candidate sign in
          </Link>
        </p>
      )}
    </div>
  )
}
