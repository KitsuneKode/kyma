import { MarketingFooter } from '@/components/marketing/footer'
import { MarketingHeader } from '@/components/marketing/header'
import { PersonaHub } from '@/components/marketing/persona/persona-hub'
import { MobileCtaDock } from '@/components/marketing/mobile-cta-dock'
import { createPageMetadata } from '@/lib/seo/metadata'
import { cacheLife, cacheTag } from 'next/cache'
import { hasClerkServerCredentials } from '@/lib/clerk/config'

export const metadata = createPageMetadata({
  title: 'Solutions',
  description:
    'Explore how Kyma supports education teams, tutor recruiters, online learning companies, and communication-heavy hiring workflows.',
  path: '/for',
})

export default async function ForHubPage() {
  'use cache'
  cacheLife('hours')
  cacheTag('marketing-personas')
  const clerkEnabled = hasClerkServerCredentials()

  return (
    <>
      <MarketingHeader clerkEnabled={clerkEnabled} />
      <main className="overflow-hidden bg-background pt-24 md:pt-28">
        <PersonaHub />
      </main>
      <MobileCtaDock />
      <MarketingFooter />
    </>
  )
}
