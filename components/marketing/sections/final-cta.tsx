import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function MarketingFinalCta() {
  return (
    <section className="relative py-24 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(232,255,71,0.06),transparent_45%)]"
      />
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="font-serif text-4xl font-medium tracking-tight text-balance sm:text-5xl md:text-6xl">
          Ready to screen with evidence?
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
          See the full candidate experience in a two-minute demo interview, or
          log in to review real assessment reports.
        </p>
        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <div className="rounded-[calc(var(--radius-xl)+0.125rem)] border border-border/60 bg-muted/20 p-[3px] shadow-sm backdrop-blur-sm">
            <Button
              size="lg"
              className="rounded-xl px-8 text-base shadow-inner transition-transform"
              render={<Link href="/interviews/demo-invite" />}
              nativeButton={false}
            >
              Try a demo interview
            </Button>
          </div>
          <Button
            size="lg"
            variant="outline"
            className="h-12 rounded-xl px-8 text-base ring-1 ring-border/40 transition-transform hover:bg-muted/30"
            render={<Link href="/admin" />}
            nativeButton={false}
          >
            Sign In / Dashboard
          </Button>
        </div>
      </div>
    </section>
  )
}
