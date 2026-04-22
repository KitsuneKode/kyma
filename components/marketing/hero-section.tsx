import {
  IconShieldCheck,
  IconListDetails,
  IconDatabase,
  IconUserScan,
} from '@tabler/icons-react'
import { HeroHeader } from '@/components/marketing/header'
import { MarketingPageComposer } from '@/components/marketing/page-composer'
import { MarketingHeroMain } from '@/components/marketing/sections/hero-main'
import { MarketingSocialProof } from '@/components/marketing/sections/social-proof'
import { MarketingHowItWorks } from '@/components/marketing/sections/how-it-works'
import { MarketingRolePathways } from '@/components/marketing/sections/role-pathways'
import { MarketingSystemCredibility } from '@/components/marketing/sections/system-credibility'
import { MarketingFinalCta } from '@/components/marketing/sections/final-cta'

const trustIcons = [
  IconShieldCheck,
  IconListDetails,
  IconDatabase,
  IconUserScan,
]

export default function HeroSection() {
  const sections = [
    {
      id: 'hero-main',
      node: (
        <MarketingHeroMain
          eyebrow="AI-Powered Tutor Screening"
          title="Screen tutors with evidence, not guesswork"
          subtitle="Kyma runs structured voice interviews with AI, then delivers rubric-scored reports so your team can make confident hiring decisions in minutes."
          primaryCta={{
            label: 'Try a demo interview',
            href: '/interviews/demo-invite',
          }}
          secondaryCta={{ label: 'Recruiter login', href: '/admin' }}
          showcaseDarkSrc="/mockups/hero.png"
          showcaseLightSrc="/mockups/hero.png"
        />
      ),
    },
    {
      id: 'social-proof',
      node: (
        <MarketingSocialProof
          title="Built on proven infrastructure"
          href="#how-it-works"
          icons={trustIcons}
        />
      ),
    },
    {
      id: 'how-it-works',
      node: <MarketingHowItWorks />,
    },
    {
      id: 'role-pathways',
      node: <MarketingRolePathways />,
    },
    {
      id: 'system-credibility',
      node: <MarketingSystemCredibility />,
    },
    {
      id: 'final-cta',
      node: <MarketingFinalCta />,
    },
  ]

  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden">
        <MarketingPageComposer sections={sections} />
      </main>
    </>
  )
}
