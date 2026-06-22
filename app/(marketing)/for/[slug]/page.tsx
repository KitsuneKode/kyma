import { notFound } from 'next/navigation'

import { MarketingFooter } from '@/components/marketing/footer'
import { MarketingHeader } from '@/components/marketing/header'
import { PersonaLanding } from '@/components/marketing/persona/persona-landing'
import { MobileCtaDock } from '@/components/marketing/mobile-cta-dock'
import { PersonaJsonLd } from '@/components/seo/persona-json-ld'
import { createPageMetadata } from '@/lib/seo/metadata'
import {
  getAllPersonaSlugs,
  getPersonaPage,
  personaPath,
} from '@/lib/seo/personas'
import { cacheLife, cacheTag } from 'next/cache'
import { hasClerkServerCredentials } from '@/lib/clerk/config'

type PersonaPageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllPersonaSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PersonaPageProps) {
  const { slug } = await params
  const persona = getPersonaPage(slug)

  if (!persona) {
    return createPageMetadata({
      title: 'Solutions',
      description: 'Explore Kyma solutions for hiring teams.',
      path: '/for',
      noIndex: true,
    })
  }

  return createPageMetadata({
    title: persona.metaTitle,
    description: persona.metaDescription,
    path: personaPath(slug),
  })
}

export default async function PersonaPage({ params }: PersonaPageProps) {
  'use cache'
  cacheLife('hours')
  cacheTag('marketing-personas')

  const { slug } = await params
  const persona = getPersonaPage(slug)

  if (!persona) {
    notFound()
  }

  const clerkEnabled = hasClerkServerCredentials()

  return (
    <>
      <PersonaJsonLd persona={persona} />
      <MarketingHeader clerkEnabled={clerkEnabled} />
      <main className="overflow-hidden bg-background">
        <PersonaLanding persona={persona} />
      </main>
      <MobileCtaDock />
      <MarketingFooter />
    </>
  )
}
