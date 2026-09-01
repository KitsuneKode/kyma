'use client'

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { ChartEmptyState } from '@/components/recruiter/chart-states'
import { formatDimensionLabel } from '@/lib/recruiter/format'
import { isReportHardGateDimension } from '@/lib/rubric/resolve-rubric'

const chartConfig = {
  score: {
    label: 'Score',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

type RadarDatum = {
  dimension: string
  score: number
  label: string
  isHardGate: boolean
}

type RubricRadarChartProps = {
  dimensionScores: Array<{
    dimension: string
    score: number
  }>
  hardGateDimensions?: string[]
}

export function RubricRadarChart({
  dimensionScores,
  hardGateDimensions,
}: RubricRadarChartProps) {
  if (!dimensionScores.length) {
    return <ChartEmptyState message="No dimension scores to chart yet." />
  }

  const data: RadarDatum[] = dimensionScores.map((d) => {
    const hardGate = isReportHardGateDimension(d.dimension, hardGateDimensions)
    const baseLabel = formatDimensionLabel(d.dimension)
    return {
      dimension: d.dimension,
      label: hardGate ? `${baseLabel} *` : baseLabel,
      score: d.score,
      isHardGate: hardGate,
    }
  })

  return (
    <div className="flex flex-col gap-2">
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[260px] w-full"
        initialDimension={{ width: 320, height: 260 }}
      >
        <RadarChart
          data={data}
          margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
        >
          <PolarGrid gridType="polygon" />
          <PolarAngleAxis
            dataKey="label"
            tick={{ fontSize: 10, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            domain={[0, 5]}
            tickCount={6}
            tick={{ fontSize: 9 }}
            axisLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Radar
            name="Score"
            dataKey="score"
            stroke="var(--color-score)"
            fill="var(--color-score)"
            fillOpacity={0.15}
            strokeWidth={1.5}
            dot={false}
          />
        </RadarChart>
      </ChartContainer>
      {data.some((item) => item.isHardGate) ? (
        <p className="text-center text-[10px] text-muted-foreground">
          * Hard-gate dimension
        </p>
      ) : null}
    </div>
  )
}
