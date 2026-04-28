'use client'

import { motion } from 'motion/react'
import {
  IconShieldCheck,
  IconListDetails,
  IconDatabase,
  IconUserScan,
} from '@tabler/icons-react'

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

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.23, 1, 0.32, 1],
    },
  },
}

export function MarketingSystemCredibility() {
  return (
    <section className="relative isolate bg-[#000] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-[3rem] leading-[0.95] font-semibold tracking-tighter text-balance text-white sm:text-[4rem]">
            Built for hiring reliability
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-white/60">
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
              className="group rounded-[1.5rem] bg-white/5 p-8 shadow-2xl ring-1 ring-white/10 transition-colors duration-300 hover:bg-white/10"
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-white/10 transition-transform duration-300 group-hover:scale-110">
                <feature.icon className="size-6 text-white" stroke={1.5} />
              </div>
              <h3 className="mt-8 text-xl font-semibold tracking-tight text-white">
                {feature.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-pretty text-white/60">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
