'use client'

import dynamic from 'next/dynamic'

import type { RubricRadarChart } from '@/components/recruiter/rubric-radar-chart'

const RubricRadarChartLazy = dynamic(
  () =>
    import('@/components/recruiter/rubric-radar-chart').then(
      (mod) => mod.RubricRadarChart
    ),
  { ssr: false }
)

type RubricRadarProps = {
  dimensionScores: Array<{
    dimension: string
    score: number
  }>
}

export function RubricRadar({ dimensionScores }: RubricRadarProps) {
  return <RubricRadarChartLazy dimensionScores={dimensionScores} />
}

export type { RubricRadarChart }
