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
    title: 'Create a screening batch',
    description:
      'Recruiters launch an invite-only screening batch with template, expiry, and attempt policy set up front.',
  },
  {
    icon: IconMicrophone,
    number: '02',
    title: 'Candidate completes live interview',
    description:
      'Candidates join from their invite link and complete a structured real-time voice interview with full transcript capture.',
  },
  {
    icon: IconReportAnalytics,
    number: '03',
    title: 'Review evidence, decide fast',
    description:
      'Recruiters triage sessions in the queue using rubric scores, transcript citations, and recommendation context.',
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
            A recruiter-ready flow from screening setup to evidence-backed
            decisions.
          </p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={{
            visible: { transition: { staggerChildren: 0.08 } },
          }}
          className="mt-16 grid gap-5 lg:auto-rows-[minmax(180px,auto)] lg:grid-cols-12"
        >
          <motion.aside
            variants={STAGGER_VARIANTS}
            className="lg:col-span-5 lg:row-span-2"
          >
            <div className="h-full rounded-3xl bg-card p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
              <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                Why teams choose Kyma
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-balance">
                One pipeline, from invite policy to final decision.
              </h3>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  Screening policy prevents unbounded retries and stale links.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  Real-time transcript capture keeps scoring auditable.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  Queue-first review helps teams prioritize what needs attention
                  now.
                </li>
              </ul>
            </div>
          </motion.aside>

          {steps.map((step, index) => {
            const bentoSpanClass =
              index === 0
                ? 'lg:col-span-7'
                : index === 1
                  ? 'lg:col-span-4'
                  : 'lg:col-span-3'

            return (
              <motion.div
                key={step.number}
                variants={STAGGER_VARIANTS}
                className={`group relative overflow-hidden rounded-3xl bg-card p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_12px_30px_rgba(0,0,0,0.35)] ${bentoSpanClass}`}
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
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
