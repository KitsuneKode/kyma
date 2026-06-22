'use client'

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts'

import { formatDimensionLabel } from '@/lib/recruiter/format'
import { isDefaultHardGateDimension } from '@/lib/rubric/constants'
import { ChartEmptyState } from '@/components/recruiter/chart-states'

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

function isHardGateDimension(
  dimension: string,
  hardGateDimensions?: string[]
): boolean {
  if (hardGateDimensions?.includes(dimension)) return true
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
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart
          data={data}
          margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
        >
          <PolarGrid gridType="polygon" stroke="hsl(var(--muted) / 0.3)" />
          <PolarAngleAxis
            dataKey="label"
            tick={{
              fill: 'hsl(var(--muted-foreground))',
              fontSize: 10,
              fontWeight: 500,
            }}
          />
          <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
          <Radar
            name="Score"
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.15}
            strokeWidth={1.5}
            dot={false}
          />
        </RadarChart>
      </ResponsiveContainer>
      {data.some((item) => item.isHardGate) ? (
        <p className="text-center text-[10px] text-muted-foreground">
          * Hard-gate dimension
        </p>
      ) : null}
    </div>
  )
}
