'use client'

import dynamic from 'next/dynamic'

import { ChartLoadingState } from '@/components/recruiter/chart-states'
import type { RubricScoreBarsChart } from '@/components/recruiter/rubric-score-bars-chart'

const RubricScoreBarsChartLazy = dynamic(
  () =>
    import('@/components/recruiter/rubric-score-bars-chart').then(
      (mod) => mod.RubricScoreBarsChart
    ),
  {
    ssr: false,
    loading: () => <ChartLoadingState height={160} />,
  }
)

type RubricScoreBarsProps = {
  dimensionScores: Array<{
    dimension: string
    score: number
  }>
  hardGateDimensions?: string[]
}

export function RubricScoreBars({
  dimensionScores,
  hardGateDimensions,
}: RubricScoreBarsProps) {
  return (
    <RubricScoreBarsChartLazy
      dimensionScores={dimensionScores}
      hardGateDimensions={hardGateDimensions}
    />
  )
}

export type { RubricScoreBarsChart }
