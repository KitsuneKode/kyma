import { describe, expect, it } from 'vitest'

import {
  buildSessionActivitySeries,
  engagementAtTime,
} from '@/lib/recruiter/session-activity-series'

describe('buildSessionActivitySeries', () => {
  it('returns empty series when no events exist', () => {
    expect(buildSessionActivitySeries([])).toEqual({
      data: [],
      value: 0,
      windowSecs: 60,
    })
  })

  it('computes candidate talk share per time bucket', () => {
    const start = '2026-01-01T12:00:00.000Z'
    const series = buildSessionActivitySeries(
      [
        {
          type: 'candidate-speaking',
          createdAt: '2026-01-01T12:00:10.000Z',
        },
        {
          type: 'candidate-speaking',
          createdAt: '2026-01-01T12:00:20.000Z',
        },
        {
          type: 'agent-speaking',
          createdAt: '2026-01-01T12:00:25.000Z',
        },
        {
          type: 'candidate-speaking',
          createdAt: '2026-01-01T12:01:05.000Z',
        },
      ],
      { sessionStartAt: start, bucketSeconds: 30 }
    )

    expect(series.data).toEqual([
      { time: 0, value: 67 },
      { time: 60, value: 100 },
    ])
    expect(series.value).toBe(100)
    expect(series.windowSecs).toBeGreaterThanOrEqual(60)
  })
})

describe('engagementAtTime', () => {
  it('returns the nearest bucket value for a playback time', () => {
    const data = [
      { time: 0, value: 40 },
      { time: 30, value: 70 },
      { time: 60, value: 55 },
    ]

    expect(engagementAtTime(data, 14)).toBe(40)
    expect(engagementAtTime(data, 28)).toBe(70)
    expect(engagementAtTime(data, 31)).toBe(70)
    expect(engagementAtTime([], 10)).toBeNull()
  })
})
