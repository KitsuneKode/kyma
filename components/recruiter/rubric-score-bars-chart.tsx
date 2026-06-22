'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

import { formatDimensionLabel } from '@/lib/recruiter/format'
import { scoreColor } from '@/lib/ui/score-format'

type RubricScoreBarsChartProps = {
  dimensionScores: Array<{
    dimension: string
    score: number
  }>
}

export function RubricScoreBarsChart({
  dimensionScores,
}: RubricScoreBarsChartProps) {
  const data = useMemo(() => {
    return dimensionScores
      .map((item) => ({
        dimension: item.dimension,
        label: formatDimensionLabel(item.dimension),
        score: item.score,
      }))
      .toSorted((left, right) => right.score - left.score)
  }, [dimensionScores])

  if (!data.length) return null

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 28)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
      >
        <XAxis type="number" domain={[0, 5]} hide />
        <YAxis
          type="category"
          dataKey="label"
          width={108}
          tick={{
            fill: 'hsl(var(--muted-foreground))',
            fontSize: 11,
            fontWeight: 500,
          }}
          axisLine={false}
          tickLine={false}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={14}>
          {data.map((entry) => (
            <Cell key={entry.dimension} fill={scoreColor(entry.score, 'bar')} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
