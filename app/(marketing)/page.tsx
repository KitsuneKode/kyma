import { PremiumHero } from '@/components/marketing/hero-premium'
import { PremiumFaq } from '@/components/marketing/faq-premium'
import { PremiumFooter } from '@/components/marketing/footer-premium'
import { HeroHeader } from '@/components/marketing/header'

export default function Page() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden">
        <PremiumHero />
        <PremiumFaq />
      </main>
      <PremiumFooter />
    </>
  )
}
