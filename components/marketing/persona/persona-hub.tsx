import Link from 'next/link'

import { personaPages, personaPath } from '@/lib/seo/personas'

export function PersonaHub() {
  return (
    <section className="bg-background py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold tracking-widest text-primary uppercase">
            Solutions
          </p>
          <h1 className="mt-4 font-serif text-4xl font-medium tracking-tight text-balance md:text-6xl">
            Kyma for hiring teams with different screening needs
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-pretty text-muted-foreground">
            Explore audience-specific workflows for education teams, tutor
            recruiters, online learning companies, and other communication-heavy
            roles.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {personaPages.map((persona) => (
            <Link
              key={persona.slug}
              href={personaPath(persona.slug)}
              className="rounded-[1.75rem] border border-border/60 bg-card p-8 shadow-sm transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                {persona.eyebrow}
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                {persona.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-pretty text-muted-foreground">
                {persona.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
