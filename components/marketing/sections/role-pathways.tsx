'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { IconUser, IconBriefcase } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'

const pathways = [
  {
    icon: IconUser,
    title: 'For candidates',
    description:
      'A focused and respectful screening experience. Candidates join from any device, complete a guided live interview, and get a consistent process every time.',
    points: [
      'Invite-link entry with clear access state',
      'Device check before joining the interview',
      'Structured interview flow with transparent expectations',
      'Reliable transcript capture throughout the session',
    ],
    cta: { label: 'Try a demo interview', href: '/interviews/demo-invite' },
  },
  {
    icon: IconBriefcase,
    title: 'For recruiters',
    description:
      'Review candidates with evidence instead of impressions. Recruiter workflows prioritize queue clarity, screening controls, and faster decisions.',
    points: [
      'Screening Batches with explicit invite policy',
      'Screening Templates for consistent assessment structure',
      'Needs-attention-first recruiter home',
      'Evidence-linked recommendations and reviewer notes',
    ],
    cta: { label: 'Open recruiter workspace', href: '/recruiter' },
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
            Built for both sides
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-pretty text-muted-foreground">
            Candidates get a respectful experience. Recruiters get actionable
            evidence.
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
              variants={STAGGER_VARIANTS}
              className="group relative flex flex-col overflow-hidden rounded-[2rem] bg-card p-10 shadow-2xl ring-1 ring-border/50 transition-[box-shadow,transform] duration-300 hover:ring-border"
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
              <div className="mt-10 mt-auto border-t border-border/50 pt-8">
                <Button
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-primary px-6 text-primary-foreground transition-[transform,background-color] duration-150 ease-out active:scale-[0.96]"
                  render={<Link href={pathway.cta.href} />}
                  nativeButton={false}
                >
                  {pathway.cta.label}
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
