'use client'

import Link from 'next/link'
import { motion } from '@/components/motion/client-motion'
import { IconUser, IconBriefcase } from '@tabler/icons-react'

import { signInPath, signUpPath } from '@/lib/auth/workspace-intent'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const pathways = [
  {
    id: 'for-recruiters',
    icon: IconBriefcase,
    featured: true,
    title: 'For recruiters & hiring teams',
    description:
      'Run structured screenings at scale. Review candidates with transcript-backed evidence instead of impressions, with queue clarity and policy controls built in.',
    points: [
      'Screening batches with explicit invite and retry policy',
      'Reusable templates for consistent assessment structure',
      'Needs-attention-first recruiter home',
      'Evidence-linked recommendations and reviewer notes',
    ],
    primaryCta: {
      label: 'Get started as recruiter',
      href: signUpPath('recruiter'),
    },
    secondaryCta: {
      label: 'Recruiter sign in',
      href: signInPath('recruiter'),
    },
    signInHref: signInPath('recruiter'),
  },
  {
    id: 'for-candidates',
    icon: IconUser,
    featured: false,
    title: 'For candidates',
    description:
      'A focused, respectful interview experience. Candidates join from any device via invite link and complete a guided live session with clear expectations.',
    points: [
      'Invite-link entry with clear access state',
      'Device check before joining the interview',
      'Structured interview flow with transparent expectations',
      'Reliable transcript capture throughout the session',
    ],
    primaryCta: {
      label: 'Try demo interview',
      href: '/interviews/demo-invite',
    },
    secondaryCta: {
      label: 'Create candidate account',
      href: signUpPath('candidate'),
    },
    signInHref: signInPath('candidate'),
  },
]

const STAGGER_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.23, 1, 0.32, 1] as [number, number, number, number],
    },
  },
}

export function MarketingRolePathways() {
  return (
    <section
      id="role-pathways"
      className="relative isolate scroll-mt-24 overflow-hidden bg-background pt-14 pb-24 md:scroll-mt-28 md:pt-16 md:pb-32"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_100%,hsla(0,0%,15%,0.3)_0,transparent_60%)]" />

      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="mb-4 text-sm font-semibold tracking-widest text-primary uppercase">
            Role Pathways
          </p>
          <h2 className="font-serif text-[3rem] leading-[0.95] font-medium tracking-tighter text-balance text-foreground sm:text-[4rem]">
            One platform, two clear paths
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-pretty text-muted-foreground">
            Recruitment teams operate the workspace. Candidates get a polished
            interview experience through your invite links.
          </p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={{
            visible: { transition: { staggerChildren: 0.1 } },
          }}
          className="mt-16 grid gap-8 md:grid-cols-2"
        >
          {pathways.map((pathway) => (
            <motion.div
              key={pathway.title}
              id={pathway.id}
              variants={STAGGER_VARIANTS}
              className={cn(
                'group relative flex scroll-mt-28 flex-col overflow-hidden rounded-[2rem] bg-card p-10 shadow-2xl ring-1 transition-[box-shadow,transform] duration-300 md:scroll-mt-32',
                pathway.featured
                  ? 'ring-primary/30 hover:ring-primary/50'
                  : 'ring-border/50 hover:ring-border'
              )}
            >
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,hsla(0,0%,20%,0.2)_0,transparent_50%)]" />

              <div className="flex size-14 items-center justify-center rounded-2xl bg-foreground/5 transition-[background-color,transform] duration-300 group-hover:scale-110 group-hover:bg-foreground/10">
                <pathway.icon className="size-7 text-foreground" stroke={1.5} />
              </div>
              <h3 className="mt-8 text-3xl font-semibold tracking-tight text-foreground">
                {pathway.title}
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-pretty text-muted-foreground">
                {pathway.description}
              </p>
              <ul className="mt-8 flex flex-col gap-4">
                {pathway.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 text-sm font-medium text-foreground/80"
                  >
                    <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-primary" />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-10 mt-auto flex flex-col gap-3 border-t border-border/50 pt-8">
                <Button
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-primary px-6 text-primary-foreground transition-[transform,background-color] duration-150 ease-out active:scale-[0.96]"
                  render={<Link href={pathway.primaryCta.href} />}
                  nativeButton={false}
                >
                  {pathway.primaryCta.label}
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[44px] rounded-xl"
                  render={<Link href={pathway.secondaryCta.href} />}
                  nativeButton={false}
                >
                  {pathway.secondaryCta.label}
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
