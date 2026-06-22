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
    icon: IconListDetails,
    title: 'Evidence, not a black box',
    description:
      'Every rubric score links back to transcript quotes and timestamps, so your team can audit exactly how each recommendation was formed.',
  },
  {
    icon: IconUserScan,
    title: 'Recruiters stay in control',
    description:
      'Kyma accelerates the first round and flags borderline tutors for manual review. The final hire/no-hire decision always stays with your team.',
  },
  {
    icon: IconShieldCheck,
    title: 'Invite-gated access',
    description:
      'Single-use invite flows and explicit access states keep interview entry controlled and candidate data scoped to your organization.',
  },
  {
    icon: IconDatabase,
    title: 'Durable session records',
    description:
      'Transcript and session artifacts persist across reconnects and drops, so review and replay are never blocked by a flaky call.',
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
      ease: [0.23, 1, 0.32, 1] as [number, number, number, number],
    },
  },
}

export function MarketingSystemCredibility() {
  return (
    <section
      id="trust"
      className="relative isolate scroll-mt-24 bg-background py-24 md:scroll-mt-28"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="mb-4 text-sm font-semibold tracking-widest text-primary uppercase">
            Trust &amp; control
          </p>
          <h2 className="text-[3rem] leading-[0.95] font-semibold tracking-tighter text-balance text-foreground sm:text-[4rem]">
            Serious enough to hire on
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-muted-foreground">
            A premium candidate experience, with the auditability and human
            oversight a hiring decision demands.
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
              className="group rounded-[1.5rem] bg-foreground/5 p-8 shadow-2xl ring-1 ring-border/50 transition-colors duration-300 hover:bg-foreground/10"
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-foreground/10 transition-transform duration-300 group-hover:scale-110">
                <feature.icon className="size-6 text-foreground" stroke={1.5} />
              </div>
              <h3 className="mt-8 text-xl font-semibold tracking-tight text-foreground">
                {feature.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-pretty text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
