import { MarketingDualPathwayCards } from '@/components/marketing/marketing-dual-pathway-cards'

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

        <MarketingDualPathwayCards className="mt-10" />
      </div>
    </section>
  )
}
