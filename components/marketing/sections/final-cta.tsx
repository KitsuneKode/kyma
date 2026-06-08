import Link from 'next/link'

import { signInPath, signUpPath } from '@/lib/auth/workspace-intent'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const pressable =
  'min-h-[44px] min-w-[44px] rounded-xl transition-[transform,background-color] duration-150 ease-out active:scale-[0.96]'

export function MarketingFinalCta() {
  return (
    <section className="relative py-24 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(232,255,71,0.06),transparent_45%)]"
      />
      <div className="mx-auto max-w-5xl px-6 text-center">
        <h2 className="font-serif text-4xl font-medium tracking-tight text-balance sm:text-5xl md:text-6xl">
          Ready to screen with evidence?
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
          Start in the recruiter workspace, or preview the candidate interview
          path your hires will experience.
        </p>

        <div className="mx-auto mt-10 grid max-w-4xl gap-4 text-left sm:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-primary/30 bg-card/80 p-6 shadow-[0_0_0_1px_rgba(232,255,71,0.08)] ring-1 ring-primary/20">
            <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              For hiring teams
            </p>
            <p className="mt-2 text-sm text-pretty text-muted-foreground">
              Screening batches, review queue, templates, and evidence-backed
              decisions in one workspace.
            </p>
            <div className="mt-6">
              <Button
                size="lg"
                className={cn(
                  pressable,
                  'w-full px-8 text-base shadow-inner sm:w-auto'
                )}
                render={<Link href={signUpPath('recruiter')} />}
                nativeButton={false}
              >
                Get started as recruiter
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              <Link
                href={signInPath('recruiter')}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Recruiter sign in
              </Link>
            </p>
          </div>

          <div className="flex flex-col rounded-2xl border border-border/40 bg-card/50 p-6">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Candidate experience
            </p>
            <p className="mt-2 text-sm text-pretty text-muted-foreground">
              See the live interview flow exactly as candidates do before you
              send invites.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                variant="outline"
                className={cn(
                  pressable,
                  'h-12 w-full px-8 text-base ring-1 ring-border/40 hover:bg-muted/30 sm:w-auto'
                )}
                render={<Link href="/interviews/demo-invite" />}
                nativeButton={false}
              >
                Try demo interview
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className={cn(
                  pressable,
                  'h-12 px-4 text-base text-muted-foreground'
                )}
                render={<Link href={signUpPath('candidate')} />}
                nativeButton={false}
              >
                Create candidate account
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              <Link
                href={signInPath('candidate')}
                className="font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
              >
                Candidate sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
