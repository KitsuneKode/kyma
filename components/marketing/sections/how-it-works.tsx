'use client'

import { motion } from 'motion/react'
import {
  IconUserCheck,
  IconMicrophone,
  IconReportAnalytics,
} from '@tabler/icons-react'
import { staggerContainer, staggerItem } from '@/lib/motion/presets'

const steps = [
  {
    icon: IconUserCheck,
    number: '01',
    title: 'Candidate joins via invite',
    description:
      'Share a unique link. The candidate checks their mic and camera, then joins a structured voice session with an AI interviewer.',
  },
  {
    icon: IconMicrophone,
    number: '02',
    title: 'AI conducts the interview',
    description:
      'A real-time voice conversation covers subject knowledge, teaching approach, and adaptability. Every word is transcribed and timestamped.',
  },
  {
    icon: IconReportAnalytics,
    number: '03',
    title: 'Evidence-backed report',
    description:
      'A rubric-scored assessment with transcript citations lands in the recruiter workspace. Decide with data, not gut feeling.',
  },
]

export function MarketingHowItWorks() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground">
            Three steps from invite link to hiring decision.
          </p>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-16 grid gap-8 md:grid-cols-3"
        >
          {steps.map((step) => (
            <motion.div
              key={step.number}
              variants={staggerItem}
              className="rounded-xl bg-card p-8 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <step.icon className="size-5 text-foreground" stroke={1.5} />
                </div>
                <span className="text-xs font-medium tracking-widest text-muted-foreground tabular-nums">
                  {step.number}
                </span>
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-pretty text-muted-foreground">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
