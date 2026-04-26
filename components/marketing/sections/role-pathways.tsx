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
      'A focused, respectful screening experience. Join from any device, have a real conversation with an AI interviewer, and know your session is being evaluated fairly with a structured rubric.',
    points: [
      'Browser-based, no downloads required',
      'Real-time voice interview with AI',
      'Transparent session timing and policies',
      'Durable session records for fairness',
    ],
    cta: { label: 'Try a demo interview', href: '/interviews/demo-invite' },
  },
  {
    icon: IconBriefcase,
    title: 'For recruiters',
    description:
      'Review candidates with evidence, not impressions. Every session produces a scored report with transcript citations, so your team can make confident decisions at scale.',
    points: [
      'Rubric-scored assessment reports',
      'Transcript with evidence citations',
      'AI copilot for report questions',
      'Batch screening management',
    ],
    cta: { label: 'Open recruiter workspace', href: '/admin' },
  },
]

const STAGGER_VARIANTS: any = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] },
  },
}

export function MarketingRolePathways() {
  return (
    <section
      id="role-pathways"
      className="border-y border-border/40 bg-muted/10 py-24 md:py-32"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="mb-4 text-sm font-semibold tracking-wider text-primary uppercase">
            Role Pathways
          </p>
          <h2 className="font-serif text-4xl font-medium tracking-tight text-balance sm:text-5xl">
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
              className="group relative flex flex-col overflow-hidden rounded-3xl bg-card p-10 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-1 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_12px_30px_rgba(0,0,0,0.35)]"
            >
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <pathway.icon className="size-7 text-primary" stroke={1.5} />
              </div>
              <h3 className="mt-8 text-2xl font-bold tracking-tight text-foreground">
                {pathway.title}
              </h3>
              <p className="mt-4 text-base leading-relaxed text-pretty text-muted-foreground">
                {pathway.description}
              </p>
              <ul className="mt-8 flex flex-col gap-4">
                {pathway.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 text-sm font-medium text-foreground/80"
                  >
                    <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-primary/60" />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-10 mt-auto border-t border-border/40 pt-8">
                <Button
                  className="rounded-full bg-primary px-6 text-primary-foreground shadow-[0_0_0_1px_rgba(232,255,71,0.45),0_10px_30px_rgba(0,0,0,0.35)] transition-colors hover:bg-primary/90"
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
