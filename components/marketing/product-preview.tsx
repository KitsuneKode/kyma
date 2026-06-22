'use client'

import {
  IconCircleCheck,
  IconMicrophone,
  IconQuote,
  IconShieldCheck,
  IconUserCircle,
} from '@tabler/icons-react'

import { motion } from '@/components/motion/client-motion'
import { DIMENSION_LABELS, RUBRIC_DIMENSIONS } from '@/lib/rubric/constants'
import { cn } from '@/lib/utils'

const DIMENSION_SCORES: Record<(typeof RUBRIC_DIMENSIONS)[number], number> = {
  clarity: 4.6,
  simplification: 4.4,
  patience: 4.5,
  warmth: 4.1,
  listening: 3.8,
  fluency: 4.3,
  adaptability: 3.6,
  engagement: 4.0,
  accuracy: 4.4,
}

const QUEUE = [
  {
    name: 'Aarav Mehta',
    role: 'Math · Grades 6–8',
    status: 'In review',
    active: true,
  },
  {
    name: 'Sara Khan',
    role: 'Science · Grades 9–10',
    status: 'Lean yes',
    active: false,
  },
  {
    name: 'Daniel Cruz',
    role: 'English · Grades 4–6',
    status: 'Needs review',
    active: false,
  },
]

function barColor(score: number) {
  if (score >= 4) return 'bg-emerald-400'
  if (score >= 3) return 'bg-amber-400'
  return 'bg-red-400'
}

function RubricRow({
  dimension,
  index,
}: {
  dimension: (typeof RUBRIC_DIMENSIONS)[number]
  index: number
}) {
  const score = DIMENSION_SCORES[dimension]
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[4.75rem] shrink-0 truncate text-[10px] font-medium text-foreground/70">
        {DIMENSION_LABELS[dimension]}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${(score / 5) * 100}%` }}
          viewport={{ once: true }}
          transition={{
            delay: 0.5 + index * 0.06,
            duration: 0.7,
            ease: [0.23, 1, 0.32, 1],
          }}
          className={cn('h-full rounded-full', barColor(score))}
        />
      </div>
      <span className="w-6 shrink-0 text-right font-mono text-[10px] text-foreground/60 tabular-nums">
        {score.toFixed(1)}
      </span>
    </div>
  )
}

export function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-2xl bg-card text-left ring-1 ring-border/20">
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b border-border/40 bg-muted/30 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <div className="ml-2 flex min-w-0 flex-1 items-center gap-2 rounded-md bg-background/60 px-3 py-1.5 ring-1 ring-border/40">
          <IconShieldCheck className="size-3 shrink-0 text-emerald-400/80" />
          <span className="truncate font-mono text-[10px] text-muted-foreground">
            kyma.app/recruiter/candidates/ses_8f2c
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 gap-0 sm:grid-cols-[170px_1fr]">
        {/* Candidate queue */}
        <aside className="hidden flex-col gap-2 border-r border-border/40 bg-muted/10 p-3 sm:flex">
          <p className="px-1 text-[9px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Review queue
          </p>
          {QUEUE.map((candidate) => (
            <div
              key={candidate.name}
              className={cn(
                'flex items-center gap-2 rounded-lg p-2 ring-1 transition-colors',
                candidate.active
                  ? 'bg-foreground/5 ring-border/60'
                  : 'ring-transparent hover:bg-foreground/5'
              )}
            >
              <IconUserCircle
                className={cn(
                  'size-6 shrink-0',
                  candidate.active ? 'text-foreground/70' : 'text-foreground/30'
                )}
                stroke={1.5}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium text-foreground">
                  {candidate.name}
                </p>
                <p className="truncate text-[9px] text-muted-foreground">
                  {candidate.role}
                </p>
              </div>
            </div>
          ))}
        </aside>

        {/* Review panel */}
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          {/* Candidate header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  Aarav Mehta
                </h3>
                <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[9px] font-medium text-foreground/70">
                  Math · Grades 6–8
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <IconMicrophone className="size-3" />
                Live tutor screening · 17m · transcript captured
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-emerald-400/10 px-3 py-2 ring-1 ring-emerald-400/20">
              <IconCircleCheck className="size-4 text-emerald-400" />
              <div className="leading-none">
                <p className="text-[9px] tracking-wide text-emerald-300/80 uppercase">
                  Recommendation
                </p>
                <p className="mt-0.5 text-xs font-semibold text-foreground">
                  Lean yes · 4.2/5
                </p>
              </div>
            </div>
          </div>

          {/* Rubric grid */}
          <div>
            <p className="mb-2.5 text-[9px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Teaching rubric
            </p>
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
              {RUBRIC_DIMENSIONS.map((dimension, index) => (
                <RubricRow
                  key={dimension}
                  dimension={dimension}
                  index={index}
                />
              ))}
            </div>
          </div>

          {/* Evidence */}
          <div className="rounded-xl bg-foreground/[0.04] p-3 ring-1 ring-border/40">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[9px] font-semibold tracking-[0.14em] text-primary uppercase">
                <IconQuote className="size-3" />
                Evidence · Simplification
              </span>
              <span className="font-mono text-[9px] text-muted-foreground">
                06:12
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-foreground/80">
              “Think of the fraction like a pizza cut into four slices—if you
              eat one, three are left, so that’s three quarters.”
            </p>
            <p className="mt-2 text-[9px] text-muted-foreground">
              Captured during the teaching simulation with the student persona.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
