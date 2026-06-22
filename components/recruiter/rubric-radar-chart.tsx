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

type RadarDatum = {
  dimension: string
  score: number
  label: string
}

type RubricRadarChartProps = {
  dimensionScores: Array<{
    dimension: string
    score: number
  }>
}

export function RubricRadarChart({ dimensionScores }: RubricRadarChartProps) {
  const data: RadarDatum[] = dimensionScores.map((d) => ({
    dimension: d.dimension,
    label: formatDimensionLabel(d.dimension),
    score: d.score,
  }))

  return (
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
  )
}
