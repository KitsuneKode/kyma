'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { IconChevronDown } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { formatDimensionLabel } from '@/lib/recruiter/format'
import { EvidenceCard } from './evidence-card'

function scoreColor(score: number) {
  if (score <= 2.0) return 'bg-red-500/15 text-red-300'
  if (score <= 3.0) return 'bg-amber-500/15 text-amber-300'
  if (score <= 4.0) return 'bg-emerald-500/10 text-emerald-300'
  return 'bg-emerald-500/20 text-emerald-300 font-bold'
}

type DimensionEvidence = {
  id: string
  snippet: string
  rationale: string
  startedAtSec?: number
}

type RubricDimensionProps = {
  dimension: string
  score: number
  rationale: string
  evidence: DimensionEvidence[]
  defaultOpen?: boolean
  isActive: boolean
  onSelect: () => void
  onJumpToTime?: (sec: number) => void
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function RubricDimension({
  dimension,
  score,
  rationale,
  evidence,
  defaultOpen = false,
  isActive,
  onSelect,
  onJumpToTime,
}: RubricDimensionProps) {
  const [expanded, setExpanded] = useState(defaultOpen)

  return (
    <div
      className={cn(
        'rounded-2xl border transition-[border-color,background-color] duration-200',
        isActive
          ? 'border-primary/20 bg-primary/[0.04]'
          : 'border-border/40 bg-transparent'
      )}
    >
      <button
        type="button"
        onClick={() => {
          setExpanded((prev) => !prev)
          onSelect()
        }}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight">
            {formatDimensionLabel(dimension)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {evidence.length} evidence clip{evidence.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums',
              scoreColor(score)
            )}
          >
            {score.toFixed(1)}
          </span>
          <IconChevronDown
            className={cn(
              'size-3.5 text-muted-foreground transition-transform duration-200',
              expanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2.5 px-4 pb-4">
              <p className="text-xs leading-5 text-pretty text-muted-foreground">
                {rationale}
              </p>
              {evidence.map((item, index) => (
                <EvidenceCard
                  key={item.id}
                  snippet={item.snippet}
                  rationale={item.rationale}
                  timestamp={
                    item.startedAtSec !== undefined
                      ? formatTime(item.startedAtSec)
                      : undefined
                  }
                  index={index}
                  onJumpToTime={
                    item.startedAtSec !== undefined && onJumpToTime
                      ? () => onJumpToTime(item.startedAtSec!)
                      : undefined
                  }
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
