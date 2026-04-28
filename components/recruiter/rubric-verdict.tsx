'use client'

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { RubricDimension } from './rubric-dimension'
import { RubricRadar } from './rubric-radar'

function getScoreColor(score: number) {
  if (score <= 2.0) return 'text-red-500'
  if (score <= 3.0) return 'text-amber-500'
  return 'text-emerald-500'
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

  if (!dimensionScores.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-muted-foreground/60">
          No dimension scores available yet.
        </p>
      </div>
    )
  }

  const radius = 54
  const circumference = 2 * Math.PI * radius
  const dashoffset = circumference - (overallScore / 5) * circumference

  return (
    <div className="flex flex-col">
      {/* Massive Typographic Focal Point + Animated Ring */}
      <div className="mb-8 flex flex-col items-center py-6">
        <div className="relative flex items-center justify-center">
          <svg className="size-40 -rotate-90 transform" viewBox="0 0 120 120">
            <circle
              className="text-muted/20"
              strokeWidth="6"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="60"
              cy="60"
            />
            <motion.circle
              className={getScoreColor(overallScore)}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="60"
              cy="60"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashoffset }}
              transition={{
                duration: 1.2,
                ease: [0.23, 1, 0.32, 1],
                delay: 0.2,
              }}
            />
          </svg>
          <div className="absolute flex flex-col items-center text-center">
            <span
              className={cn(
                'text-5xl font-semibold tracking-tighter tabular-nums',
                getScoreColor(overallScore)
              )}
            >
              {overallScore.toFixed(1)}
            </span>
            <span className="mt-1 text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase">
              Overall
            </span>
          </div>
        </div>
      </div>

      {/* Dimension radar overview */}
      <div className="mb-6 px-2">
        <RubricRadar dimensionScores={dimensionScores} />
      </div>

      <div className="flex flex-col gap-1">
        <motion.ul
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.04 } },
          }}
          className="flex flex-col divide-y divide-border/20"
        >
          {enriched.map((d) => (
            <motion.li
              key={d.dimension}
              variants={{
                hidden: { opacity: 0, y: 10, filter: 'blur(4px)' },
                visible: {
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] },
                },
              }}
            >
              <RubricDimension
                dimension={d.dimension}
                score={d.score}
                rationale={d.rationale}
                evidence={d.evidence}
                defaultOpen={d.score <= 3.0}
                isActive={activeDimension === d.dimension}
                onSelect={() => onSelectDimension(d.dimension)}
                onJumpToTime={onJumpToTime}
              />
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </div>
  )
}
