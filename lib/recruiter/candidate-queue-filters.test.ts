import { describe, expect, it } from 'vitest'

import {
  buildCandidateQueueSearchParams,
  parseCandidateQueueFilters,
} from './candidate-queue-filters'

describe('parseCandidateQueueFilters', () => {
  it('defaults to all filters when params are missing', () => {
    expect(parseCandidateQueueFilters(new URLSearchParams())).toEqual({
      status: 'all',
      recommendation: 'all',
    })
  })

  it('reads valid status and recommendation from the URL', () => {
    const params = new URLSearchParams(
      'status=manual_review&recommendation=strong_yes'
    )
    expect(parseCandidateQueueFilters(params)).toEqual({
      status: 'manual_review',
      recommendation: 'strong_yes',
    })
  })

  it('ignores unknown filter values', () => {
    const params = new URLSearchParams('status=invalid&recommendation=maybe')
    expect(parseCandidateQueueFilters(params)).toEqual({
      status: 'all',
      recommendation: 'all',
    })
  })
})

describe('buildCandidateQueueSearchParams', () => {
  it('omits all when filters are default', () => {
    expect(
      buildCandidateQueueSearchParams({
        status: 'all',
        recommendation: 'all',
      }).toString()
    ).toBe('')
  })

  it('serializes active filters', () => {
    expect(
      buildCandidateQueueSearchParams({
        status: 'manual_review',
        recommendation: 'all',
      }).toString()
    ).toBe('status=manual_review')
  })
})
