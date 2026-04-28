'use client'

import { motion } from 'motion/react'
import {
  IconUserCheck,
  IconMicrophone,
  IconReportAnalytics,
  IconLink,
  IconCalendar,
  IconShield,
  IconVolume,
  IconMessageCircle,
  IconCheck,
  IconStar,
} from '@tabler/icons-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.23, 1, 0.32, 1] as const,
    },
  },
}

function StepBadge({ number }: { number: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-foreground/10 px-3 py-1 text-[10px] font-semibold tracking-widest text-foreground/70 uppercase">
      <span className="size-1.5 rounded-full bg-primary" />
      Step {number.toString().padStart(2, '0')}
    </span>
  )
}

function StepIcon({
  icon: Icon,
  color = 'var(--primary)',
}: {
  icon: typeof IconUserCheck
  color?: string
}) {
  return (
    <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground/5 ring-1 ring-border/50">
      <Icon className="size-6" style={{ color }} stroke={1.5} />
    </div>
  )
}

// Mock UI Components for visual richness
function BatchCreationMock() {
  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-3 rounded-xl bg-foreground/5 p-4 ring-1 ring-border/40">
        <div className="flex size-10 items-center justify-center rounded-lg bg-foreground/5">
          <IconLink className="size-5 text-foreground/60" />
        </div>
        <div className="flex-1">
          <div className="h-2 w-24 rounded-full bg-foreground/20" />
          <div className="mt-2 h-1.5 w-16 rounded-full bg-foreground/10" />
        </div>
        <div className="rounded-full bg-primary/20 px-2 py-1 text-[10px] font-medium text-primary">
          Active
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-foreground/5 p-3">
          <IconCalendar className="size-4 text-foreground/40" />
          <div className="h-1.5 w-20 rounded-full bg-foreground/15" />
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-foreground/5 p-3">
          <IconShield className="size-4 text-foreground/40" />
          <div className="h-1.5 w-16 rounded-full bg-foreground/15" />
        </div>
      </div>
    </div>
  )
}

function InterviewMock() {
  return (
    <div className="mt-8">
      <div className="relative overflow-hidden rounded-xl bg-foreground/5 p-6 ring-1 ring-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
        <div className="relative flex items-center justify-center gap-6">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex size-16 items-center justify-center rounded-full bg-foreground/5 ring-1 ring-border/50"
          >
            <IconVolume className="size-8 text-foreground/60" />
          </motion.div>
          <div className="space-y-2">
            <div className="h-2 w-32 rounded-full bg-foreground/20" />
            <div className="h-2 w-24 rounded-full bg-foreground/10" />
          </div>
        </div>
        <div className="relative mt-6 space-y-2">
          <div className="flex gap-2">
            <div className="h-8 flex-1 rounded-lg bg-foreground/5" />
            <div className="size-8 rounded-lg bg-primary/20" />
          </div>
          <div className="flex items-center gap-2 text-[10px] text-foreground/40">
            <IconMessageCircle className="size-3" />
            <span>Live transcript capturing...</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReviewMock() {
  return (
    <div className="mt-8 space-y-3">
      {[
        { score: 4.5, label: 'Communication', color: 'bg-emerald-400' },
        { score: 4.0, label: 'Problem Solving', color: 'bg-emerald-400' },
        { score: 3.5, label: 'Concept Clarity', color: 'bg-amber-400' },
      ].map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
          viewport={{ once: true }}
          className="flex items-center gap-3 rounded-lg bg-foreground/5 p-3"
        >
          <div className="flex size-6 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-semibold text-foreground">
            {item.score}
          </div>
          <div className="flex-1">
            <div className="h-1.5 w-full rounded-full bg-foreground/10">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${(item.score / 5) * 100}%` }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                viewport={{ once: true }}
                className={cn('h-full rounded-full', item.color)}
              />
            </div>
          </div>
          <div className="h-1.5 w-16 rounded-full bg-foreground/10" />
        </motion.div>
      ))}
      <div className="flex items-center justify-between rounded-lg bg-primary/10 p-3 ring-1 ring-primary/20">
        <div className="flex items-center gap-2">
          <IconStar className="size-4 text-primary" />
          <span className="text-xs font-medium text-foreground">
            Strong Yes
          </span>
        </div>
        <IconCheck className="size-4 text-emerald-400" />
      </div>
    </div>
  )
}

import { cn } from '@/lib/utils'

export function MarketingHowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 md:py-24">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.03] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="text-center"
        >
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
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="mt-20 grid grid-cols-1 gap-6 lg:grid-cols-2"
        >
          {/* Step 1 - Full width hero card */}
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden rounded-[2.5rem] bg-card p-8 shadow-2xl ring-1 ring-border/50 lg:col-span-2 lg:p-12"
          >
            {/* Gradient orb */}
            <div className="absolute -top-32 -right-32 size-64 rounded-full bg-primary/10 blur-[80px] transition-all duration-700 group-hover:bg-primary/15" />

            <div className="relative grid gap-8 lg:grid-cols-2 lg:gap-12">
              <div>
                <div className="mb-6 flex items-center gap-4">
                  <StepIcon icon={IconUserCheck} color="#e8ff47" />
                  <StepBadge number={1} />
                </div>
                <h3 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Create a screening batch
                </h3>
                <p className="mt-4 text-lg text-pretty text-muted-foreground">
                  Recruiters launch an invite-only screening batch with
                  template, expiry, and attempt policy set up front. No
                  unbounded retries, no stale links.
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-foreground/5 to-transparent opacity-50" />
                <BatchCreationMock />
              </div>
            </div>
          </motion.div>

          {/* Step 2 - Interview card */}
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden rounded-[2rem] bg-card p-8 shadow-2xl ring-1 ring-border/50"
          >
            <div className="absolute -right-16 -bottom-16 size-32 rounded-full bg-primary/10 blur-[60px] transition-all duration-700 group-hover:bg-primary/15" />

            <div className="relative">
              <div className="mb-6 flex items-center gap-4">
                <StepIcon icon={IconMicrophone} />
                <StepBadge number={2} />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                Live interview capture
              </h3>
              <p className="mt-3 text-pretty text-muted-foreground">
                Candidates join from their invite link and complete a structured
                real-time voice interview.
              </p>
              <InterviewMock />
            </div>
          </motion.div>

          {/* Step 3 - Review card */}
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden rounded-[2rem] bg-card p-8 shadow-2xl ring-1 ring-border/50"
          >
            <div className="absolute -bottom-16 -left-16 size-32 rounded-full bg-primary/10 blur-[60px] transition-all duration-700 group-hover:bg-primary/15" />

            <div className="relative">
              <div className="mb-6 flex items-center gap-4">
                <StepIcon icon={IconReportAnalytics} />
                <StepBadge number={3} />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                Review and decide
              </h3>
              <p className="mt-3 text-pretty text-muted-foreground">
                Recruiters triage sessions using rubric scores and transcript
                evidence.
              </p>
              <ReviewMock />
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="mt-10 text-center"
        >
          <p className="text-sm text-muted-foreground">
            Ready to streamline your tutor screening?
          </p>
        </motion.div>
      </div>
    </section>
  )
}
