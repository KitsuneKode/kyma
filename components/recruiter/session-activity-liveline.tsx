'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { useReducedMotion } from 'motion/react'

import {
  ChartEmptyState,
  ChartErrorState,
  ChartLoadingState,
} from '@/components/recruiter/chart-states'
import {
  buildSessionActivitySeries,
  engagementAtTime,
  engagementSeriesColor,
  formatEngagementPercent,
  type SessionActivityEvent,
} from '@/lib/recruiter/session-activity-series'
import { formatTime } from '@/lib/format/time'
import { cn } from '@/lib/utils'

const Liveline = dynamic(
  () => import('liveline').then((module) => module.Liveline),
  {
    ssr: false,
    loading: () => <ChartLoadingState height={200} />,
  }
)

type SessionActivityLivelineProps = {
  events: SessionActivityEvent[]
  sessionStartAt?: string | null
  className?: string
  currentTimeSec?: number
  onHoverTime?: (timeSec: number) => void
}

export function SessionActivityLiveline({
  events,
  sessionStartAt,
  className,
  currentTimeSec,
  onHoverTime,
}: SessionActivityLivelineProps) {
  const prefersReducedMotion = useReducedMotion()

  const series = useMemo(
    () =>
      buildSessionActivitySeries(events, {
        sessionStartAt,
        bucketSeconds: 30,
      }),
    [events, sessionStartAt]
  )

  const playheadValue = useMemo(() => {
    if (currentTimeSec === undefined || !series.data.length) {
      return null
    }
    return engagementAtTime(series.data, currentTimeSec)
  }, [currentTimeSec, series.data])

  const playheadPct = useMemo(() => {
    if (currentTimeSec === undefined || series.windowSecs <= 0) {
      return null
    }
    return Math.min(
      100,
      Math.max(0, (currentTimeSec / series.windowSecs) * 100)
    )
  }, [currentTimeSec, series.windowSecs])

  if (!series.data.length) {
    return (
      <ChartEmptyState
        height={200}
        message="No speaking activity recorded for this session yet."
        className={className}
      />
    )
  }

  const displayValue = playheadValue !== null ? playheadValue : series.value
  const color = engagementSeriesColor(displayValue)

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Candidate engagement
        </p>
        <div className="text-right">
          <p className="font-mono text-xs text-muted-foreground tabular-nums">
            {formatEngagementPercent(displayValue)}
          </p>
          {currentTimeSec !== undefined ? (
            <p className="font-mono text-[10px] text-muted-foreground/80 tabular-nums">
              At {formatTime(currentTimeSec)}
            </p>
          ) : null}
        </div>
      </div>
      <div className="relative h-[200px] w-full overflow-hidden rounded-xl ring-1 ring-border/40">
        {playheadPct !== null ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 z-10 w-px bg-primary/70"
            style={{ left: `${playheadPct}%` }}
          />
        ) : null}
        <Liveline
          data={series.data}
          value={displayValue}
          window={series.windowSecs}
          color={color}
          grid
          badge={false}
          momentum
          showValue
          scrub={Boolean(onHoverTime)}
          paused={prefersReducedMotion ?? false}
          exaggerate
          referenceLine={{ value: 50, label: 'Balanced' }}
          formatValue={(value) => `${value}%`}
          formatTime={(time) => formatTime(time)}
          onHover={(point) => {
            if (point && onHoverTime) {
              onHoverTime(point.time)
            }
          }}
          emptyText="No session activity"
        />
      </div>
    </div>
  )
}

export function SessionActivityLivelineBoundary({
  className,
  ...props
}: SessionActivityLivelineProps) {
  try {
    return <SessionActivityLiveline className={className} {...props} />
  } catch {
    return (
      <ChartErrorState
        height={200}
        className={cn(className)}
        message="Session activity chart failed to load."
      />
    )
  }
}
