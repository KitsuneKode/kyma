import { MarketingHero } from '@/components/marketing/sections/hero'
import { MarketingHowItWorks } from '@/components/marketing/sections/how-it-works'
import { MarketingRolePathways } from '@/components/marketing/sections/role-pathways'
import { MarketingSystemCredibility } from '@/components/marketing/sections/system-credibility'
import { MarketingFaq } from '@/components/marketing/sections/faq'
import { MarketingFinalCta } from '@/components/marketing/sections/final-cta'
import { MarketingFooter } from '@/components/marketing/footer'
import { MarketingHeader } from '@/components/marketing/header'
import { MobileCtaDock } from '@/components/marketing/mobile-cta-dock'
import { MarketingJsonLd } from '@/components/seo/json-ld'
import { brand } from '@/lib/brand/site'
import { createSiteMetadata } from '@/lib/seo/metadata'
import { cacheLife, cacheTag } from 'next/cache'
import { hasClerkServerCredentials } from '@/lib/clerk/config'

export const metadata = createSiteMetadata({
  title: {
    absolute: `${brand.name} — ${brand.headline}`,
  },
  description: brand.description,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: `${brand.name} — ${brand.headline}`,
    description: brand.description,
    url: '/',
  },
  twitter: {
    title: `${brand.name} — ${brand.headline}`,
    description: brand.description,
  },
})

export default async function Page() {
  'use cache'
  cacheLife('hours')
  cacheTag('marketing')
  const clerkEnabled = hasClerkServerCredentials()

  return (
    <>
      <MarketingJsonLd />
      <MarketingHeader clerkEnabled={clerkEnabled} />
      <main className="overflow-hidden bg-background">
        <MarketingHero />
        <MarketingHowItWorks />
        <MarketingRolePathways />
        <MarketingSystemCredibility />
        <MarketingFaq />
        <MarketingFinalCta />
      </main>
      <MobileCtaDock />
      <MarketingFooter />
    </>
  )
}
