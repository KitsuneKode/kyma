'use client'

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts'
import { formatDimensionLabel } from '@/lib/recruiter/format'

type RadarDatum = {
  dimension: string
  score: number
  label: string
}

type RubricRadarProps = {
  dimensionScores: Array<{
    dimension: string
    score: number
  }>
}

export function RubricRadar({ dimensionScores }: RubricRadarProps) {
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
