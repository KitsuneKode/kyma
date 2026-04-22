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
    title: 'Secure by design',
    description:
      'Sessions run over encrypted channels. Credentials never leave the server boundary. Audit trails for every action.',
  },
  {
    icon: IconListDetails,
    title: 'Structured rubric scoring',
    description:
      '9-dimension weighted assessment with hard gates. Every score links back to transcript evidence.',
  },
  {
    icon: IconDatabase,
    title: 'Durable session records',
    description:
      'Transcripts, events, and recordings persist across reconnects. No data lost to dropped connections.',
  },
  {
    icon: IconUserScan,
    title: 'Recruiter in the loop',
    description:
      'AI generates recommendations, humans make decisions. Override, annotate, and review with full context.',
  },
]

export function MarketingSystemCredibility() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Built for reliability
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground">
            The architecture behind confident hiring decisions.
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
