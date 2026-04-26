'use client'

import { useMemo } from 'react'
import { IconShieldCheck, IconAlertTriangle } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { RubricDimension } from './rubric-dimension'

function scoreColor(score: number) {
  if (score <= 2.0) return 'bg-red-500/15 text-red-300'
  if (score <= 3.0) return 'bg-amber-500/15 text-amber-300'
  if (score <= 4.0) return 'bg-emerald-500/10 text-emerald-300'
  return 'bg-emerald-500/20 text-emerald-300 font-bold'
}

type DimensionScore = {
  dimension: string
  score: number
  rationale: string
}

type EvidenceItem = {
  id: string
  dimension: string
  snippet: string
  rationale: string
  startedAtSec?: number
}

type RubricVerdictProps = {
  dimensionScores: DimensionScore[]
  evidence: EvidenceItem[]
  activeDimension: string | null
  onSelectDimension: (dimension: string) => void
  onJumpToTime?: (sec: number) => void
}

export function RubricVerdict({
  dimensionScores,
  evidence,
  activeDimension,
  onSelectDimension,
  onJumpToTime,
}: RubricVerdictProps) {
  const enriched = useMemo(() => {
    return dimensionScores.map((score) => ({
      ...score,
      evidence: evidence.filter((e) => e.dimension === score.dimension),
    }))
  }, [dimensionScores, evidence])

  const overallScore = useMemo(() => {
    if (!dimensionScores.length) return 0
    const sum = dimensionScores.reduce((acc, d) => acc + d.score, 0)
    return sum / dimensionScores.length
  }, [dimensionScores])

  const flagged = enriched.filter((d) => d.score <= 3.0)
  const passing = enriched.filter((d) => d.score > 3.0)

  const hasHardGate = flagged.some((d) => d.score <= 1.5)

  if (!dimensionScores.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/50 bg-card/80 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No dimension scores available yet.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-card/90 p-4 ring-1 ring-border/40">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {hasHardGate ? (
              <IconAlertTriangle className="size-4 text-red-400" />
            ) : (
              <IconShieldCheck className="size-4 text-emerald-400" />
            )}
            <span className="text-sm font-semibold">Overall</span>
          </div>
          <span
            className={cn(
              'rounded-full px-3 py-1 text-sm font-semibold tabular-nums',
              scoreColor(overallScore)
            )}
          >
            {overallScore.toFixed(1)}
            <span className="ml-1 opacity-60">/ 5</span>
          </span>
        </div>
        {hasHardGate ? (
          <p className="mt-2 text-xs text-red-300/80">
            Hard gate triggered — at least one dimension scored ≤ 1.5
          </p>
        ) : null}
      </div>

      {flagged.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="px-1 text-[10px] font-semibold tracking-widest text-red-300/70 uppercase">
            Flagged ({flagged.length})
          </p>
          {flagged.map((d) => (
            <RubricDimension
              key={d.dimension}
              dimension={d.dimension}
              score={d.score}
              rationale={d.rationale}
              evidence={d.evidence}
              defaultOpen
              isActive={activeDimension === d.dimension}
              onSelect={() => onSelectDimension(d.dimension)}
              onJumpToTime={onJumpToTime}
            />
          ))}
        </div>
      ) : null}

      {passing.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="px-1 text-[10px] font-semibold tracking-widest text-emerald-300/70 uppercase">
            Passing ({passing.length})
          </p>
          {passing.map((d) => (
            <RubricDimension
              key={d.dimension}
              dimension={d.dimension}
              score={d.score}
              rationale={d.rationale}
              evidence={d.evidence}
              defaultOpen={false}
              isActive={activeDimension === d.dimension}
              onSelect={() => onSelectDimension(d.dimension)}
              onJumpToTime={onJumpToTime}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
