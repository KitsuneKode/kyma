import { describe, expect, it } from 'vitest'

import {
  isCitationJumpable,
  resolveCitationRef,
} from '@/lib/recruiter/citation-resolve'

const context = {
  recordingStartTime: '2026-07-10T12:00:00.000Z',
  transcript: [
    {
      startedAt: '2026-07-10T12:00:05.000Z',
      startSec: 5,
    },
    {
      startedAt: '2026-07-10T12:00:20.000Z',
      startSec: 20,
    },
  ],
  evidence: [
    {
      dimension: 'clarity',
      startedAt: '2026-07-10T12:00:05.000Z',
      startedAtSec: 5,
    },
    {
      dimension: 'pace',
      startedAtSec: 20,
    },
  ],
}

describe('resolveCitationRef', () => {
  it('resolves raw numeric seconds', () => {
    expect(resolveCitationRef('12.5', context)).toEqual({ timeSec: 12.5 })
  })

  it('resolves transcript ISO refs to timeSec', () => {
    expect(
      resolveCitationRef('transcript:2026-07-10T12:00:20.000Z', context)
    ).toEqual({ timeSec: 20 })
  })

  it('resolves evidence index refs to evidence + time', () => {
    expect(resolveCitationRef('evidence:0:clarity', context)).toEqual({
      evidenceIndex: 0,
      dimension: 'clarity',
      timeSec: 5,
    })
  })

  it('still focuses evidence when timing is missing', () => {
    const target = resolveCitationRef('evidence:0:pace', {
      ...context,
      evidence: [{ dimension: 'pace' }],
    })
    expect(target).toEqual({
      evidenceIndex: 0,
      dimension: 'pace',
    })
    expect(isCitationJumpable(target)).toBe(true)
  })

  it('returns null for unknown refs', () => {
    expect(resolveCitationRef('dimension:clarity', context)).toBeNull()
    expect(isCitationJumpable(null)).toBe(false)
  })
})
