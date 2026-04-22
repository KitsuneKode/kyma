import Link from 'next/link'

import { Button } from '@/components/ui/button'

export function MarketingFinalCta() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Ready to screen with evidence?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
          See the full candidate experience in a two-minute demo interview, or
          log in to review real assessment reports.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <div className="rounded-[calc(var(--radius-xl)+0.125rem)] border bg-foreground/10 p-0.5">
            <Button
              size="lg"
              className="rounded-xl px-5 text-base"
              render={<Link href="/interviews/demo-invite" />}
              nativeButton={false}
            >
              Try a demo interview
            </Button>
          </div>
          <Button
            size="lg"
            variant="ghost"
            className="h-10.5 rounded-xl px-5"
            render={<Link href="/admin" />}
            nativeButton={false}
          >
            Recruiter login
          </Button>
        </div>
      </div>
    </section>
  )
}
