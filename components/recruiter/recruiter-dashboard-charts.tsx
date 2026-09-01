'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

type TimelineDatum = {
  date: string
  sessions: number
}

type FunnelDatum = {
  name: string
  value: number
  fill: string
}

export function SessionTimelineChart({ data }: { data: TimelineDatum[] }) {
  return (
    <ChartContainer
      config={{
        sessions: { label: 'Sessions', color: 'var(--primary)' },
      }}
      className="h-[180px] w-full"
    >
      <AreaChart
        data={data}
        margin={{ left: -10, right: 8, top: 8, bottom: 0 }}
      >
        <defs>
          <linearGradient id="dashSessions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          opacity={0.6}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="sessions"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="url(#dashSessions)"
          dot={false}
          activeDot={{
            r: 4,
            strokeWidth: 2,
            fill: 'var(--card)',
            stroke: 'var(--primary)',
          }}
          isAnimationActive
          animationDuration={900}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ChartContainer>
  )
}

export function InviteFunnelChart({ data }: { data: FunnelDatum[] }) {
  return (
    <ChartContainer
      config={{
        value: { label: 'Count', color: 'var(--primary)' },
      }}
      className="h-[180px] w-full"
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          opacity={0.5}
          horizontal={false}
        />
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={84}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar
          dataKey="value"
          radius={[8, 8, 8, 8]}
          barSize={18}
          isAnimationActive
          animationDuration={800}
          animationEasing="ease-out"
        />
      </BarChart>
    </ChartContainer>
  )
}
