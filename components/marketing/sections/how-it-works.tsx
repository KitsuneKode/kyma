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

        <div className="mt-16 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <aside className="lg:sticky lg:top-28 lg:h-fit">
            <div className="rounded-3xl bg-card p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
              <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                Why teams choose Kyma
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-balance">
                One flow. Fewer bottlenecks. Better hiring signal.
              </h3>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  Candidate readiness checks reduce failed calls.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  Live transcript and rubric build trust in outcomes.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  Recruiters review faster with citation-linked evidence.
                </li>
              </ul>
            </div>
          </aside>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={{
              visible: { transition: { staggerChildren: 0.1 } },
            }}
            className="grid gap-5"
          >
            {steps.map((step) => (
              <motion.div
                key={step.number}
                variants={STAGGER_VARIANTS}
                className="group relative overflow-hidden rounded-3xl bg-card p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_12px_30px_rgba(0,0,0,0.35)]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <step.icon className="size-6 text-primary" stroke={1.5} />
                  </div>
                  <span className="text-xs font-bold tracking-widest text-muted-foreground tabular-nums opacity-50">
                    STEP {step.number}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-pretty text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
