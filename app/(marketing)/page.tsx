import { PremiumHero } from '@/components/marketing/hero-premium'
import { MarketingHowItWorks } from '@/components/marketing/sections/how-it-works'
import { MarketingRolePathways } from '@/components/marketing/sections/role-pathways'
import { PremiumFaq } from '@/components/marketing/faq-premium'
import { MarketingFinalCta } from '@/components/marketing/sections/final-cta'
import { PremiumFooter } from '@/components/marketing/footer-premium'
import { HeroHeader } from '@/components/marketing/header'
import { MobileCtaDock } from '@/components/marketing/mobile-cta-dock'
export const revalidate = 3600

export default function Page() {
  return (
    <>
      <HeroHeader />
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
