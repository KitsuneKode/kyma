import { PremiumHero } from '@/components/marketing/hero-premium'
import { MarketingHowItWorks } from '@/components/marketing/sections/how-it-works'
import { MarketingRolePathways } from '@/components/marketing/sections/role-pathways'
import { PremiumFaq } from '@/components/marketing/faq-premium'
import { MarketingFinalCta } from '@/components/marketing/sections/final-cta'
import { PremiumFooter } from '@/components/marketing/footer-premium'
import { HeroHeader } from '@/components/marketing/header'
import { MobileCtaDock } from '@/components/marketing/mobile-cta-dock'
import { cacheLife, cacheTag } from 'next/cache'
import { hasClerkServerCredentials } from '@/lib/clerk/config'

export default async function Page() {
  'use cache'
  cacheLife('hours')
  cacheTag('marketing')
  const clerkEnabled = hasClerkServerCredentials()

  return (
    <>
      <HeroHeader clerkEnabled={clerkEnabled} />
      <main className="overflow-hidden bg-[#0a0a0a]">
        <PremiumHero />
        <MarketingHowItWorks />
        <MarketingRolePathways />
        <PremiumFaq />
        <MarketingFinalCta />
      </main>
      <MobileCtaDock />
      <PremiumFooter />
    </>
  )
}
