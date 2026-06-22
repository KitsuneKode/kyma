'use client'

import dynamic from 'next/dynamic'

import type { RubricScoreBarsChart } from '@/components/recruiter/rubric-score-bars-chart'

const RubricScoreBarsChartLazy = dynamic(
  () =>
    import('@/components/recruiter/rubric-score-bars-chart').then(
      (mod) => mod.RubricScoreBarsChart
    ),
  { ssr: false }
)

type RubricScoreBarsProps = {
  dimensionScores: Array<{
    dimension: string
    score: number
  }>
}

export function RubricScoreBars({ dimensionScores }: RubricScoreBarsProps) {
  return <RubricScoreBarsChartLazy dimensionScores={dimensionScores} />
}

export type { RubricScoreBarsChart }
