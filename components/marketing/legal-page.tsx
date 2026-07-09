import type { ReactNode } from 'react'

import { MarketingFooter } from '@/components/marketing/footer'
import { MarketingHeader } from '@/components/marketing/header'
import { hasClerkServerCredentials } from '@/lib/clerk/config'

export function MarketingLegalPage({
  title,
  effectiveDate,
  children,
}: {
  title: string
  effectiveDate: string
  children: ReactNode
}) {
  const clerkEnabled = hasClerkServerCredentials()

  return (
    <>
      <MarketingHeader clerkEnabled={clerkEnabled} />
      <main className="bg-background pt-24 md:pt-28">
        <article className="mx-auto max-w-3xl px-6 py-16 md:py-20">
          <header className="border-b border-border/30 pb-10">
            <p className="text-sm tracking-wide text-muted-foreground">
              Kitsune Labs · Kyma
            </p>
            <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-foreground md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Effective date: {effectiveDate}
            </p>
          </header>
          <div className="mt-12 space-y-10 text-base leading-relaxed text-muted-foreground">
            {children}
          </div>
        </article>
      </main>
      <MarketingFooter />
    </>
  )
}

export function LegalSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}
