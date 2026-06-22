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
import { isDefaultHardGateDimension } from '@/lib/rubric/constants'
import { scoreColor } from '@/lib/ui/score-format'
import { ChartEmptyState } from '@/components/recruiter/chart-states'

type RubricScoreBarsChartProps = {
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

export function RubricScoreBarsChart({
  dimensionScores,
  hardGateDimensions,
}: RubricScoreBarsChartProps) {
  const data = useMemo(() => {
    return dimensionScores
      .map((item) => {
        const hardGate = isHardGateDimension(item.dimension, hardGateDimensions)
        const baseLabel = formatDimensionLabel(item.dimension)
        return {
          dimension: item.dimension,
          label: hardGate ? `${baseLabel} *` : baseLabel,
          score: item.score,
          isHardGate: hardGate,
        }
      })
      .toSorted((left, right) => right.score - left.score)
  }, [dimensionScores, hardGateDimensions])

  if (!data.length) {
    return (
      <ChartEmptyState
        height={160}
        message="No dimension scores to chart yet."
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <ResponsiveContainer
        width="100%"
        height={Math.max(160, data.length * 28)}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
        >
          <XAxis type="number" domain={[0, 5]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={116}
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
              <Cell
                key={entry.dimension}
                fill={scoreColor(entry.score, 'bar')}
                stroke={
                  entry.isHardGate
                    ? 'hsl(var(--destructive) / 0.55)'
                    : undefined
                }
                strokeWidth={entry.isHardGate ? 1.5 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {data.some((item) => item.isHardGate) ? (
        <p className="text-[10px] text-muted-foreground">
          * Hard-gate dimension
        </p>
      ) : null}
    </div>
  )
}
