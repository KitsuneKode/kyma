'use client'

import dynamic from 'next/dynamic'

import { ChartErrorBoundary } from '@/components/recruiter/chart-error-boundary'
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
    <ChartErrorBoundary height={160}>
      <RubricScoreBarsChartLazy
        dimensionScores={dimensionScores}
        hardGateDimensions={hardGateDimensions}
      />
    </ChartErrorBoundary>
  )
}

export type { RubricScoreBarsChart }
