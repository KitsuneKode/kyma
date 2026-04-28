'use client'

import { motion } from 'motion/react'
import {
  IconUserCheck,
  IconMicrophone,
  IconReportAnalytics,
} from '@tabler/icons-react'

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
    <section id="how-it-works" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="mb-4 text-sm font-semibold tracking-wider text-primary uppercase">
            The Workflow
          </p>
          <h2 className="font-serif text-[3rem] leading-[0.95] font-medium tracking-tighter text-balance sm:text-[4rem]">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-pretty text-muted-foreground">
            A recruiter-ready flow from screening setup to evidence-backed
            decisions.
          </p>
        </div>

        <div className="mt-24 flex flex-col gap-24">
          {/* Step 1 - Edge to edge cinematic block */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={STAGGER_VARIANTS}
            className="relative isolate overflow-hidden rounded-[2rem] bg-[#000] p-10 shadow-2xl md:p-16"
          >
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_0%,hsla(0,0%,20%,0.2)_0,transparent_50%)]" />
            <div className="max-w-2xl">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white/5">
                  <IconUserCheck className="size-6 text-white" stroke={1.5} />
                </div>
                <span className="text-xs font-bold tracking-widest text-white/50 tabular-nums">
                  STEP 01
                </span>
              </div>
              <h3 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Create a screening batch
              </h3>
              <p className="mt-4 text-lg text-pretty text-white/70">
                Recruiters launch an invite-only screening batch with template,
                expiry, and attempt policy set up front. No unbounded retries,
                no stale links.
              </p>
            </div>
            {/* Abstract geometric shapes or mock content inside the obsidian slab */}
            <div className="relative mt-12 h-48 w-full overflow-hidden rounded-xl border border-white/5 bg-white/5">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05)_0%,transparent_100%)]" />
              <div className="flex h-full items-center justify-center">
                <div className="h-2 w-1/3 rounded-full bg-white/10" />
              </div>
            </div>
          </motion.div>

          {/* Steps 2 and 3 - Asymmetric overlapping layout */}
          <div className="relative isolate grid gap-12 lg:grid-cols-2">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={STAGGER_VARIANTS}
              className="relative z-10 rounded-[2rem] bg-[#000] p-10 shadow-2xl md:p-12 lg:mt-24 lg:-mr-12"
            >
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_100%_100%,hsla(0,0%,20%,0.2)_0,transparent_50%)]" />
              <div className="mb-6 flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white/5">
                  <IconMicrophone className="size-6 text-white" stroke={1.5} />
                </div>
                <span className="text-xs font-bold tracking-widest text-white/50 tabular-nums">
                  STEP 02
                </span>
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Live interview capture
              </h3>
              <p className="mt-4 text-pretty text-white/70">
                Candidates join from their invite link and complete a structured
                real-time voice interview with full transcript capture.
              </p>
              <div className="mt-8 flex h-32 w-full items-center justify-center rounded-xl border border-white/5 bg-white/5">
                <div className="h-12 w-12 rounded-full border border-white/20 bg-white/10" />
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={STAGGER_VARIANTS}
              className="relative z-0 rounded-[2rem] bg-[#000] p-10 shadow-2xl md:p-12 lg:-ml-12"
            >
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_100%,hsla(0,0%,20%,0.2)_0,transparent_50%)]" />
              <div className="mb-6 flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white/5">
                  <IconReportAnalytics
                    className="size-6 text-white"
                    stroke={1.5}
                  />
                </div>
                <span className="text-xs font-bold tracking-widest text-white/50 tabular-nums">
                  STEP 03
                </span>
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Review and decide
              </h3>
              <p className="mt-4 text-pretty text-white/70">
                Recruiters triage sessions in the queue using rubric scores,
                transcript citations, and recommendation context. Decide with
                confidence.
              </p>
              <div className="mt-8 flex h-48 w-full flex-col justify-between rounded-xl border border-white/5 bg-white/5 p-4">
                <div className="h-2 w-3/4 rounded-full bg-white/10" />
                <div className="h-2 w-1/2 rounded-full bg-white/10" />
                <div className="h-2 w-5/6 rounded-full bg-white/10" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
