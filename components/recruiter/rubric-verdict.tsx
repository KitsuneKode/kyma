'use client'

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { RubricDimension } from './rubric-dimension'
import { RubricScoreBars } from './rubric-score-bars'
import {
  formatScoreValue,
  resolveOverallScore,
  scoreBandClass,
  scoreTextColor,
} from '@/lib/ui/score-format'

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
  weightedScore?: number | null
  hardGateTriggered?: boolean
  activeDimension: string | null
  onSelectDimension: (dimension: string) => void
  onJumpToTime?: (sec: number) => void
}

export function RubricVerdict({
  dimensionScores,
  evidence,
  weightedScore,
  hardGateTriggered = false,
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

  const overallScore = useMemo(
    () => resolveOverallScore(weightedScore, dimensionScores),
    [dimensionScores, weightedScore]
  )

  if (!dimensionScores.length) {
    return (
      <WorkspaceSurface className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground/60">
          No dimension scores available yet.
        </p>
      </WorkspaceSurface>
    )
  }

  return (
    <WorkspaceSurface className="flex flex-col p-5">
      <div className="mb-5 flex items-center gap-4">
        <div
          className={cn(
            'flex size-16 shrink-0 items-center justify-center rounded-2xl',
            overallScore !== null ? scoreBandClass(overallScore) : 'bg-muted/20'
          )}
        >
          <span
            className={cn(
              'font-mono text-2xl font-semibold tabular-nums',
              overallScore !== null
                ? scoreTextColor(overallScore)
                : 'text-muted-foreground'
            )}
          >
            {formatScoreValue(overallScore)}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold">Overall rubric score</p>
          <p className="text-xs text-muted-foreground">
            Weighted score out of 5.0
            {hardGateTriggered ? ' · Hard gate triggered' : ''}
          </p>
        </div>
      </div>

      <div className="mb-5">
        <RubricScoreBars dimensionScores={dimensionScores} />
      </div>

      <motion.ul
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.03 } },
        }}
        className="flex flex-col divide-y divide-border/30"
      >
        {enriched.map((dimension) => (
          <motion.li
            key={dimension.dimension}
            variants={{
              hidden: { opacity: 0, y: 6 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] },
              },
            }}
          >
            <RubricDimension
              dimension={dimension.dimension}
              score={dimension.score}
              rationale={dimension.rationale}
              evidence={dimension.evidence}
              defaultOpen={dimension.score <= 3.0}
              isActive={activeDimension === dimension.dimension}
              onSelect={() => onSelectDimension(dimension.dimension)}
              onJumpToTime={onJumpToTime}
              variant="flat"
            />
          </motion.li>
        ))}
      </motion.ul>
    </WorkspaceSurface>
  )
}
