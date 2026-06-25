import type { LivelinePoint } from 'liveline'

export type SessionActivityEvent = {
  type: string
  createdAt: string
}

export type SessionActivitySeries = {
  data: LivelinePoint[]
  value: number
  windowSecs: number
}

const SPEAKING_EVENT_TYPES = new Set(['agent-speaking', 'candidate-speaking'])

/**
 * Builds a rolling candidate talk-share series (0–100) from session events.
 * Time is elapsed seconds from the session/recording anchor.
 */
export function buildSessionActivitySeries(
  events: SessionActivityEvent[],
  options?: {
    sessionStartAt?: string | null
    bucketSeconds?: number
  }
): SessionActivitySeries {
  if (events.length === 0) {
    return { data: [], value: 0, windowSecs: 60 }
  }

  const sorted = [...events].toSorted(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  )

  const anchorMs = options?.sessionStartAt
    ? new Date(options.sessionStartAt).getTime()
    : new Date(sorted[0].createdAt).getTime()

  const bucketSeconds = options?.bucketSeconds ?? 30
  const buckets = new Map<
    number,
    { candidate: number; agent: number; other: number }
  >()

  for (const event of sorted) {
    const elapsedSec = Math.max(
      0,
      (new Date(event.createdAt).getTime() - anchorMs) / 1000
    )
    const bucket = Math.floor(elapsedSec / bucketSeconds) * bucketSeconds
    const counts = buckets.get(bucket) ?? {
      candidate: 0,
      agent: 0,
      other: 0,
    }

    if (event.type === 'candidate-speaking') {
      counts.candidate += 1
    } else if (event.type === 'agent-speaking') {
      counts.agent += 1
    } else if (SPEAKING_EVENT_TYPES.has(event.type)) {
      // handled above
    } else {
      counts.other += 1
    }

    buckets.set(bucket, counts)
  }

  const data: LivelinePoint[] = [...buckets.entries()]
    .toSorted(([left], [right]) => left - right)
    .map(([time, counts]) => {
      const speakingTotal = counts.candidate + counts.agent
      const ratio =
        speakingTotal > 0
          ? counts.candidate / speakingTotal
          : counts.other > 0
            ? 0.25
            : 0
      return {
        time,
        value: Math.round(ratio * 100),
      }
    })

  const lastValue = data.at(-1)?.value ?? 0
  const lastTime = data.at(-1)?.time ?? bucketSeconds
  const windowSecs = Math.max(60, lastTime + bucketSeconds)

  return {
    data,
    value: lastValue,
    windowSecs,
  }
}

export function engagementAtTime(
  series: LivelinePoint[],
  timeSec: number
): number | null {
  if (!series.length) {
    return null
  }

  let nearest = series[0]
  let nearestDistance = Math.abs(nearest.time - timeSec)

  for (const point of series) {
    const distance = Math.abs(point.time - timeSec)
    if (distance < nearestDistance) {
      nearest = point
      nearestDistance = distance
    }
  }

  return nearest.value
}

export function formatEngagementPercent(value: number) {
  return `${value}% candidate`
}

export function engagementSeriesColor(value: number) {
  if (value >= 55) return '#059669'
  if (value >= 30) return '#d97706'
  return '#dc2626'
}
