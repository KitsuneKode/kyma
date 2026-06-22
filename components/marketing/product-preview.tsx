'use client'

import { useState } from 'react'
import {
  IconCircleCheckFilled,
  IconMicrophone,
  IconPlayerPlayFilled,
  IconQuote,
  IconSparkles,
} from '@tabler/icons-react'

import { motion } from '@/components/motion/client-motion'
import { DIMENSION_LABELS, RUBRIC_DIMENSIONS } from '@/lib/rubric/constants'
import { cn } from '@/lib/utils'

type Dimension = (typeof RUBRIC_DIMENSIONS)[number]

const DIMENSION_SCORES: Record<Dimension, number> = {
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

const EVIDENCE_DIMENSION: Dimension = 'simplification'

const QUEUE = [
  { name: 'Aarav Mehta', role: 'Math · 6–8', state: 'review', active: true },
  { name: 'Sara Khan', role: 'Science · 9–10', state: 'yes', active: false },
  { name: 'Daniel Cruz', role: 'English · 4–6', state: 'flag', active: false },
  { name: 'Mei Lin', role: 'Math · 9–10', state: 'yes', active: false },
]

const STATE_DOT: Record<string, string> = {
  review: 'bg-primary',
  yes: 'bg-emerald-400',
  flag: 'bg-amber-400',
}

const TRANSCRIPT = [
  {
    speaker: 'Kyma',
    agent: true,
    text: 'How would you introduce fractions to a student who has never seen them before?',
  },
  {
    speaker: 'Aarav',
    agent: false,
    text: 'I’d start with something they already share—splitting a chocolate bar makes “parts of a whole” concrete before any notation.',
  },
]

function barColor(score: number) {
  if (score >= 4) return 'bg-emerald-400'
  if (score >= 3) return 'bg-amber-400'
  return 'bg-red-400'
}

function WindowDot({ className }: { className: string }) {
  return <span className={cn('size-3 rounded-full', className)} />
}

function RubricRow({
  dimension,
  index,
  active,
  onHover,
}: {
  dimension: Dimension
  index: number
  active: boolean
  onHover: (d: Dimension) => void
}) {
  const score = DIMENSION_SCORES[dimension]
  return (
    <button
      type="button"
      onMouseEnter={() => onHover(dimension)}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2 py-1 text-left transition-colors',
        active ? 'bg-foreground/[0.06]' : 'hover:bg-foreground/[0.04]'
      )}
    >
      <span
        className={cn(
          'w-[4.5rem] shrink-0 truncate text-[10px] font-medium transition-colors',
          active ? 'text-foreground' : 'text-foreground/70'
        )}
      >
        {DIMENSION_LABELS[dimension]}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${(score / 5) * 100}%` }}
          viewport={{ once: true }}
          transition={{
            delay: 0.5 + index * 0.055,
            duration: 0.7,
            ease: [0.23, 1, 0.32, 1],
          }}
          className={cn('h-full rounded-full', barColor(score))}
        />
      </div>
      <span className="w-6 shrink-0 text-right font-mono text-[10px] text-foreground/55 tabular-nums">
        {score.toFixed(1)}
      </span>
    </button>
  )
}

export function ProductPreview() {
  const [activeDimension, setActiveDimension] =
    useState<Dimension>(EVIDENCE_DIMENSION)

  return (
    <div className="overflow-hidden rounded-2xl bg-card text-left ring-1 ring-border/20">
      {/* Window title bar */}
      <div className="relative flex items-center border-b border-border/40 bg-muted/30 px-4 py-2.5">
        <div className="flex gap-1.5">
          <WindowDot className="bg-red-400/70" />
          <WindowDot className="bg-amber-400/70" />
          <WindowDot className="bg-emerald-400/70" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center">
          <span className="font-mono text-[10px] tracking-wide text-muted-foreground">
            Recruiter review · Aarav Mehta
          </span>
        </div>
      </div>

      {/* Command header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">
              Aarav Mehta
            </h3>
            <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[9px] font-medium text-foreground/70">
              Math · Grades 6–8
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <IconMicrophone className="size-3" />
            17m session · 12 candidate turns · 14 agent turns · report ready
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-emerald-400/10 px-3 py-1.5 ring-1 ring-emerald-400/20">
          <IconCircleCheckFilled className="size-4 text-emerald-400" />
          <div className="leading-none">
            <p className="text-[8px] tracking-[0.14em] text-emerald-300/80 uppercase">
              Recommendation
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-foreground">
              Lean yes · 4.2/5 · High confidence
            </p>
          </div>
        </div>
      </div>

      {/* Body: queue / transcript / rubric */}
      <div className="grid grid-cols-1 md:grid-cols-[132px_minmax(0,1fr)] lg:grid-cols-[132px_minmax(0,1fr)_268px]">
        {/* Queue */}
        <aside className="hidden flex-col gap-1 border-r border-border/40 bg-muted/10 p-2.5 md:flex">
          <p className="px-1.5 pb-1 text-[8px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Review queue
          </p>
          {QUEUE.map((c) => (
            <div
              key={c.name}
              className={cn(
                'flex items-center gap-2 rounded-lg p-1.5 ring-1 transition-colors',
                c.active
                  ? 'bg-foreground/[0.06] ring-border/50'
                  : 'ring-transparent hover:bg-foreground/[0.04]'
              )}
            >
              <span
                className={cn(
                  'size-1.5 shrink-0 rounded-full',
                  STATE_DOT[c.state]
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-medium text-foreground">
                  {c.name}
                </p>
                <p className="truncate text-[8px] text-muted-foreground">
                  {c.role}
                </p>
              </div>
            </div>
          ))}
        </aside>

        {/* Transcript */}
        <div className="flex flex-col border-border/40 lg:border-r">
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-2">
            <span className="text-[8px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Transcript
            </span>
            <span className="flex items-center gap-1 text-[8px] text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
              Synced
            </span>
          </div>

          <div className="flex flex-col gap-3 p-4">
            {TRANSCRIPT.map((turn) => (
              <div key={turn.speaker} className="flex flex-col gap-1">
                <span
                  className={cn(
                    'flex items-center gap-1 text-[8px] font-semibold tracking-wide uppercase',
                    turn.agent ? 'text-primary' : 'text-foreground/60'
                  )}
                >
                  {turn.agent ? <IconSparkles className="size-2.5" /> : null}
                  {turn.speaker}
                </span>
                <p
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed',
                    turn.agent
                      ? 'bg-primary/[0.06] text-foreground/85'
                      : 'bg-foreground/[0.04] text-foreground/80'
                  )}
                >
                  {turn.text}
                </p>
              </div>
            ))}

            {/* Teaching simulation evidence turn */}
            <div className="flex items-center gap-2 pt-1">
              <span className="h-px flex-1 bg-border/50" />
              <span className="text-[8px] font-semibold tracking-[0.14em] text-amber-400/80 uppercase">
                Teaching simulation
              </span>
              <span className="h-px flex-1 bg-border/50" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-semibold tracking-wide text-foreground/60 uppercase">
                Student persona
              </span>
              <p className="rounded-lg bg-foreground/[0.04] px-2.5 py-1.5 text-[11px] leading-relaxed text-foreground/80">
                But why is 3/4 bigger than 2/4? The bottom number is the same…
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="flex flex-col gap-1"
              onViewportEnter={() => setActiveDimension(EVIDENCE_DIMENSION)}
            >
              <span className="flex items-center justify-between text-[8px] font-semibold tracking-wide text-foreground/60 uppercase">
                Aarav
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[8px] text-primary normal-case">
                  <IconQuote className="size-2.5" />
                  Simplification · 06:12
                </span>
              </span>
              <p className="rounded-lg bg-primary/[0.06] px-2.5 py-1.5 text-[11px] leading-relaxed text-foreground/90 ring-1 ring-primary/20">
                “Think of the fraction like a pizza cut into four slices—if you
                eat one, three are left, so that’s three quarters.”
              </p>
            </motion.div>
          </div>

          {/* Audio scrubber */}
          <div className="mt-auto flex items-center gap-2.5 border-t border-border/40 px-4 py-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <IconPlayerPlayFilled className="size-3" />
            </span>
            <span className="font-mono text-[9px] text-muted-foreground tabular-nums">
              06:12
            </span>
            <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-foreground/10">
              <div className="absolute inset-y-0 left-0 w-[36%] rounded-full bg-primary/70" />
            </div>
            <span className="font-mono text-[9px] text-muted-foreground tabular-nums">
              17:04
            </span>
          </div>
        </div>

        {/* Rubric verdict */}
        <div className="hidden flex-col bg-muted/10 lg:flex">
          <div className="flex items-center gap-3 border-b border-border/40 px-3 py-2">
            <span className="text-[8px] font-semibold tracking-[0.16em] text-foreground uppercase">
              Rubric
            </span>
            <span className="text-[8px] tracking-[0.16em] text-muted-foreground/60 uppercase">
              Evidence
            </span>
            <span className="text-[8px] tracking-[0.16em] text-muted-foreground/60 uppercase">
              Notes
            </span>
          </div>
          <div className="flex flex-col gap-0.5 p-2.5">
            {RUBRIC_DIMENSIONS.map((dimension, index) => (
              <RubricRow
                key={dimension}
                dimension={dimension}
                index={index}
                active={activeDimension === dimension}
                onHover={setActiveDimension}
              />
            ))}
          </div>
          <div className="mt-auto border-t border-border/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[8px] tracking-[0.14em] text-muted-foreground uppercase">
                Weighted overall
              </span>
              <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
                4.2
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: '84%' }}
                viewport={{ once: true }}
                transition={{
                  delay: 1,
                  duration: 0.8,
                  ease: [0.23, 1, 0.32, 1],
                }}
                className="h-full rounded-full bg-emerald-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
