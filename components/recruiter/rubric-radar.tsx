'use client'

import dynamic from 'next/dynamic'

import { ChartErrorBoundary } from '@/components/recruiter/chart-error-boundary'
import { ChartLoadingState } from '@/components/recruiter/chart-states'
import type { RubricRadarChart } from '@/components/recruiter/rubric-radar-chart'

const RubricRadarChartLazy = dynamic(
  () =>
    import('@/components/recruiter/rubric-radar-chart').then(
      (mod) => mod.RubricRadarChart
    ),
  {
    ssr: false,
    loading: () => <ChartLoadingState />,
  }
)

type RubricRadarProps = {
  dimensionScores: Array<{
    dimension: string
    score: number
  }>
  hardGateDimensions?: string[]
}

export function RubricRadar({
  dimensionScores,
  hardGateDimensions,
}: RubricRadarProps) {
  return (
    <ChartErrorBoundary height={260}>
      <RubricRadarChartLazy
        dimensionScores={dimensionScores}
        hardGateDimensions={hardGateDimensions}
      />
    </ChartErrorBoundary>
  )
}

export type { RubricRadarChart }
