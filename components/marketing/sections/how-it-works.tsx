'use client'

import { motion } from 'motion/react'
import {
  IconUserCheck,
  IconMicrophone,
  IconReportAnalytics,
} from '@tabler/icons-react'

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

const STAGGER_VARIANTS: any = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] },
  },
}

export function MarketingHowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="mb-4 text-sm font-semibold tracking-wider text-primary uppercase">
            The Workflow
          </p>
          <h2 className="font-serif text-4xl font-medium tracking-tight text-balance sm:text-5xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-pretty text-muted-foreground">
            Three simple steps from invite link to a confident hiring decision.
          </p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={{
            visible: { transition: { staggerChildren: 0.1 } },
          }}
          className="mt-16 grid gap-8 md:grid-cols-3"
        >
          {steps.map((step) => (
            <motion.div
              key={step.number}
              variants={STAGGER_VARIANTS}
              className="group relative overflow-hidden rounded-3xl bg-card p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] ring-1 ring-border/50 transition-all hover:-translate-y-1 hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.15)]"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <step.icon className="size-6 text-primary" stroke={1.5} />
                </div>
                <span className="text-xs font-bold tracking-widest text-muted-foreground tabular-nums opacity-50">
                  STEP {step.number}
                </span>
              </div>
              <h3 className="mt-8 text-xl font-semibold tracking-tight text-foreground">
                {step.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-pretty text-muted-foreground">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
