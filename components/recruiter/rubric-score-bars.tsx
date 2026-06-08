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

function barColor(score: number) {
  if (score <= 2) return 'hsl(var(--destructive))'
  if (score <= 3) return 'hsl(38 92% 50%)'
  return 'hsl(142 71% 45%)'
}

type RubricScoreBarsProps = {
  dimensionScores: Array<{
    dimension: string
    score: number
  }>
}

export function RubricScoreBars({ dimensionScores }: RubricScoreBarsProps) {
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
            <Cell key={entry.dimension} fill={barColor(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
