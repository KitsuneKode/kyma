'use client'

import { motion } from 'motion/react'
import {
  IconShieldCheck,
  IconListDetails,
  IconDatabase,
  IconUserScan,
} from '@tabler/icons-react'

import { staggerContainer, staggerItem } from '@/lib/motion/presets'

const features = [
  {
    icon: IconShieldCheck,
    title: 'Invite-gated access',
    description:
      'Single-use invite flows and explicit access states reduce accidental exposure and keep interview entry controlled.',
  },
  {
    icon: IconListDetails,
    title: 'Reviewable scoring',
    description:
      'Structured rubric outcomes are tied back to transcript context so teams can audit how each recommendation was formed.',
  },
  {
    icon: IconDatabase,
    title: 'Durable realtime records',
    description:
      'Session events and transcript artifacts persist across reconnects, so recruiter review is never blocked by transient call issues.',
  },
  {
    icon: IconUserScan,
    title: 'Human decision authority',
    description:
      'AI assists triage speed, but recruiter decisions stay in the loop with notes, overrides, and full context.',
  },
]

export function MarketingSystemCredibility() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Built for hiring reliability
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground">
            Premium candidate experience, with operator-grade review controls.
          </p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={staggerItem}
              className="rounded-xl bg-card p-6 shadow-sm"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <feature.icon className="size-5 text-foreground" stroke={1.5} />
              </div>
              <h3 className="mt-5 text-sm font-semibold tracking-tight">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
