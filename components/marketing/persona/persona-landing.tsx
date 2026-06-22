import Link from 'next/link'

import { MarketingCtaRow } from '@/components/marketing/marketing-cta-row'
import { signUpPath } from '@/lib/auth/workspace-intent'
import {
  getRelatedPersonas,
  personaPath,
  type PersonaPage,
} from '@/lib/seo/personas'
import { Button } from '@/components/ui/button'

function PersonaSectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-semibold tracking-widest text-primary uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-4 font-serif text-4xl font-medium tracking-tight text-balance md:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-lg leading-relaxed text-pretty text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  )
}

function PersonaFaqList({ faqs }: { faqs: PersonaPage['faqs'] }) {
  return (
    <div className="divide-y divide-border/60 rounded-[1.5rem] border border-border/60 bg-card">
      {faqs.map((faq) => (
        <details key={faq.id} className="group px-6 py-5">
          <summary className="cursor-pointer list-none text-lg font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-4">
              {faq.question}
              <span className="text-muted-foreground transition-transform group-open:rotate-45">
                +
              </span>
            </span>
          </summary>
          <p className="mt-4 text-base leading-relaxed text-pretty text-muted-foreground">
            {faq.answer}
          </p>
        </details>
      ))}
    </div>
  )
}

export function PersonaLanding({ persona }: { persona: PersonaPage }) {
  const relatedPersonas = getRelatedPersonas(persona.relatedSlugs)

  return (
    <>
      <section className="relative overflow-hidden bg-background pt-28 pb-20 md:pt-36 md:pb-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(232,255,71,0.08),transparent_45%)]"
        />
        <div className="mx-auto max-w-5xl px-6 text-center">
          <p className="text-sm font-semibold tracking-widest text-primary uppercase">
            {persona.eyebrow}
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl leading-[0.98] font-semibold tracking-tighter text-balance md:text-6xl">
            {persona.headline}
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-pretty text-muted-foreground">
            {persona.description}
          </p>
          <div className="mt-10">
            <MarketingCtaRow variant="hero" />
          </div>
        </div>
      </section>

      <section className="border-t border-border/40 bg-muted/10 py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <PersonaSectionHeading
            eyebrow="Why teams switch"
            title="The screening problems this audience feels first"
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {persona.painPoints.map((point) => (
              <article
                key={point.title}
                className="rounded-[1.5rem] border border-border/60 bg-card p-6 shadow-sm"
              >
                <h3 className="text-xl font-semibold tracking-tight text-foreground">
                  {point.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-pretty text-muted-foreground">
                  {point.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <PersonaSectionHeading
            eyebrow="What changes with Kyma"
            title="Outcomes your team can operationalize"
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {persona.outcomes.map((outcome) => (
              <article
                key={outcome.title}
                className="rounded-[1.5rem] bg-foreground/[0.03] p-6 ring-1 ring-border/50"
              >
                <h3 className="text-xl font-semibold tracking-tight text-foreground">
                  {outcome.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-pretty text-muted-foreground">
                  {outcome.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/40 bg-background py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <PersonaSectionHeading
            eyebrow="Workflow"
            title="How this team uses Kyma"
            description="A repeatable screening loop from invite to evidence-backed decision."
          />
          <ol className="mt-12 grid gap-6 lg:grid-cols-3">
            {persona.workflow.map((step) => (
              <li
                key={step.step}
                className="rounded-[1.5rem] border border-border/60 bg-card p-6"
              >
                <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                  Step {step.step}
                </p>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-pretty text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-muted/10 py-20 md:py-24">
        <div className="mx-auto max-w-4xl px-6">
          <PersonaSectionHeading
            eyebrow="FAQ"
            title="Questions teams ask before rollout"
          />
          <div className="mt-10">
            <PersonaFaqList faqs={persona.faqs} />
          </div>
        </div>
      </section>

      {relatedPersonas.length > 0 ? (
        <section className="py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-6">
            <PersonaSectionHeading
              eyebrow="Related solutions"
              title="Explore Kyma for adjacent teams"
            />
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {relatedPersonas.map((related) => (
                <Link
                  key={related.slug}
                  href={personaPath(related.slug)}
                  className="rounded-[1.5rem] border border-border/60 bg-card p-6 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                    {related.eyebrow}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                    {related.headline}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {related.metaDescription}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t border-border/40 bg-background py-20 md:py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-serif text-4xl font-medium tracking-tight text-balance md:text-5xl">
            Ready to standardize tutor screening?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-pretty text-muted-foreground">
            Start with a recruiter workspace, send your first invite batch, and
            review evidence-backed reports in one place.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="min-h-[44px] rounded-xl px-8"
              render={<Link href={signUpPath('recruiter')} />}
              nativeButton={false}
            >
              Start screening tutors
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="min-h-[44px] rounded-xl px-8"
              render={<Link href="/" />}
              nativeButton={false}
            >
              Back to homepage
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
