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
    title: 'For recruiting & talent teams',
    description:
      'Screen tutors at scale and decide from evidence, not impressions. Every candidate arrives with a scored teaching rubric and transcript citations you can audit.',
    points: [
      'Tutor rubric: clarity, simplification, patience, warmth, and more',
      'Transcript-cited evidence behind every recommendation',
      'Needs-attention-first queue with manual review and overrides',
      'Reusable templates and invite policy per hiring cohort',
    ],
    primaryCta: {
      label: 'Open recruiter workspace',
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
    title: 'For tutor candidates',
    description:
      'A focused, respectful screening. Tutors join from any device via invite link and walk through a guided live interview, including a short teaching simulation.',
    points: [
      'Invite-link entry with a clear access state',
      'Device and audio check before the interview starts',
      'A guided conversation, then a real teaching simulation',
      'Reliable transcript capture throughout the session',
    ],
    primaryCta: {
      label: 'Try the candidate flow',
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
      id="what-you-review"
      className="relative isolate scroll-mt-24 overflow-hidden bg-background pt-14 pb-24 md:scroll-mt-28 md:pt-16 md:pb-32"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_100%,hsla(0,0%,15%,0.3)_0,transparent_60%)]" />

      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="mb-4 text-sm font-semibold tracking-widest text-primary uppercase">
            Two roles, one workflow
          </p>
          <h2 className="font-serif text-[3rem] leading-[0.95] font-medium tracking-tighter text-balance text-foreground sm:text-[4rem]">
            Built for recruiters, kind to candidates
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-pretty text-muted-foreground">
            Your hiring team runs structured screenings and reviews the
            evidence. Tutors get a calm, respectful interview through your
            invite links.
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
                'group relative flex scroll-mt-28 flex-col overflow-hidden rounded-[2rem] bg-card p-10 shadow-[var(--shadow-lg)] ring-1 transition-[box-shadow] duration-300 md:scroll-mt-32',
                pathway.featured
                  ? 'ring-primary/30 hover:shadow-[var(--shadow-xl)] hover:ring-primary/50'
                  : 'ring-border/50 hover:shadow-[var(--shadow-xl)] hover:ring-border'
              )}
            >
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
              <div className="mt-auto flex flex-col gap-3 border-t border-border/50 pt-8">
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
