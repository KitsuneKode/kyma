import Link from 'next/link'

import { signInPath, signUpPath } from '@/lib/auth/workspace-intent'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const pressable =
  'min-h-[44px] min-w-[44px] rounded-xl transition-[transform,background-color] duration-150 ease-out active:scale-[0.96]'

type MarketingCtaRowProps = {
  variant?: 'hero' | 'section'
  className?: string
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
          <span className="text-nowrap">Get started as recruiter</span>
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
        <span className="text-nowrap">Try demo interview</span>
      </Button>
      <p
        className={cn(
          'text-center text-sm text-muted-foreground',
          isHero ? 'w-full' : 'w-full sm:w-auto'
        )}
      >
        Already hiring?{' '}
        <Link
          href={signInPath('recruiter')}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Recruiter sign in
        </Link>
        <span className="mx-1.5 text-border">·</span>
        <Link
          href={signUpPath('candidate')}
          className="font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
        >
          Candidate account
        </Link>
        <span className="mx-1.5 text-border">·</span>
        <Link
          href={signInPath('candidate')}
          className="font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
        >
          Candidate sign in
        </Link>
      </p>
    </div>
  )
}
