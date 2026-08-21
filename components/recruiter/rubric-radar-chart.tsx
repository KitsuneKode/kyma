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
import { isDefaultHardGateDimension } from '@/lib/rubric/constants'

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

/**
 * Gate status comes from the report, which captured the rubric that actually
 * applied at scoring time. The default list is a fallback only for reports
 * written before `hardGateDimensions` was persisted - re-deriving it for every
 * report is what previously made the chart star gates the scorer ignored.
 */
function isHardGateDimension(
  dimension: string,
  hardGateDimensions?: string[]
): boolean {
  if (hardGateDimensions) {
    return hardGateDimensions.includes(dimension)
  }
  return isDefaultHardGateDimension(dimension)
}

export function RubricRadarChart({
  dimensionScores,
  hardGateDimensions,
}: RubricRadarChartProps) {
  if (!dimensionScores.length) {
    return <ChartEmptyState message="No dimension scores to chart yet." />
  }

  const data: RadarDatum[] = dimensionScores.map((d) => {
    const hardGate = isHardGateDimension(d.dimension, hardGateDimensions)
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
