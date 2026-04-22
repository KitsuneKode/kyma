'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { IconUser, IconBriefcase } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { staggerContainer, staggerItem } from '@/lib/motion/presets'

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

export function MarketingRolePathways() {
  return (
    <section id="role-pathways" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Built for both sides
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground">
            Candidates get a respectful experience. Recruiters get actionable
            evidence.
          </p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-16 grid gap-6 md:grid-cols-2"
        >
          {pathways.map((pathway) => (
            <motion.div
              key={pathway.title}
              variants={staggerItem}
              className="flex flex-col rounded-xl bg-card p-8 shadow-sm"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <pathway.icon className="size-5 text-foreground" stroke={1.5} />
              </div>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">
                {pathway.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-pretty text-muted-foreground">
                {pathway.description}
              </p>
              <ul className="mt-6 flex flex-col gap-3">
                {pathway.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 text-sm text-muted-foreground"
                  >
                    <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-foreground/30" />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <Button
                  variant="outline"
                  size="sm"
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
