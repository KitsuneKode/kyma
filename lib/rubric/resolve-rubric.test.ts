import { describe, expect, test } from 'vitest'

import {
  hardGateNamesFrom,
  isReportHardGateDimension,
  resolveRubricDimensions,
} from './resolve-rubric'

describe('resolveRubricDimensions', () => {
  test('falls back to the default nine dimensions when no rubric is configured', () => {
    const resolved = resolveRubricDimensions(undefined)

    expect(resolved).toHaveLength(9)
    expect(resolved.map((item) => item.name)).toContain('clarity')
    expect(resolved.find((item) => item.name === 'clarity')?.isHardGate).toBe(
      true
    )
    expect(resolved.find((item) => item.name === 'warmth')?.isHardGate).toBe(
      false
    )
  })

  test('honours a configured rubric, including custom dimension names', () => {
    const resolved = resolveRubricDimensions({
      dimensions: [
        { name: 'domain_depth', weight: 3, isHardGate: true },
        { name: 'warmth', weight: 1, isHardGate: false },
      ],
    })

    expect(resolved).toEqual([
      { name: 'domain_depth', weight: 3, isHardGate: true },
      { name: 'warmth', weight: 1, isHardGate: false },
    ])
  })

  test('a configured dimension can turn OFF a default hard gate', () => {
    const resolved = resolveRubricDimensions({
      dimensions: [{ name: 'clarity', weight: 1, isHardGate: false }],
    })

    expect(resolved[0]?.isHardGate).toBe(false)
  })

  test('blank dimension names are discarded', () => {
    const resolved = resolveRubricDimensions({
      dimensions: [
        { name: '  ', weight: 1, isHardGate: true },
        { name: 'clarity', weight: 2, isHardGate: true },
      ],
    })

    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.name).toBe('clarity')
  })

  test('an all-blank rubric falls back to defaults rather than scoring nothing', () => {
    const resolved = resolveRubricDimensions({
      dimensions: [{ name: '', weight: 1, isHardGate: false }],
    })

    expect(resolved).toHaveLength(9)
  })

  test('names are trimmed so lookups match the model output', () => {
    const resolved = resolveRubricDimensions({
      dimensions: [{ name: '  accuracy  ', weight: 1, isHardGate: true }],
    })

    expect(resolved[0]?.name).toBe('accuracy')
  })
})

describe('hardGateNamesFrom', () => {
  test('returns only the gated dimension names', () => {
    expect(
      hardGateNamesFrom([
        { name: 'clarity', weight: 1, isHardGate: true },
        { name: 'warmth', weight: 1, isHardGate: false },
      ])
    ).toEqual(['clarity'])
  })

  test('returns an empty list when nothing is gated', () => {
    expect(
      hardGateNamesFrom([{ name: 'warmth', weight: 1, isHardGate: false }])
    ).toEqual([])
  })
})

describe('resolveRubricDimensions rejects score-corrupting input', () => {
  test('duplicate dimension names collapse to one entry', () => {
    const resolved = resolveRubricDimensions({
      dimensions: Array.from({ length: 5 }, () => ({
        name: 'clarity',
        weight: 1,
        isHardGate: false,
      })),
    })

    // Five rows would each contribute to the numerator while the deduped
    // weights map contributed once to the denominator, giving a score of 25.
    expect(resolved).toHaveLength(1)
  })

  test('negative weights are discarded', () => {
    const resolved = resolveRubricDimensions({
      dimensions: [
        { name: 'clarity', weight: 5, isHardGate: false },
        { name: 'warmth', weight: -9, isHardGate: false },
      ],
    })

    expect(resolved.map((item) => item.name)).toEqual(['clarity'])
  })

  test('non-finite weights are discarded', () => {
    const resolved = resolveRubricDimensions({
      dimensions: [
        {
          name: 'clarity',
          weight: Number.POSITIVE_INFINITY,
          isHardGate: false,
        },
        { name: 'warmth', weight: Number.NaN, isHardGate: false },
        { name: 'accuracy', weight: 2, isHardGate: false },
      ],
    })

    expect(resolved.map((item) => item.name)).toEqual(['accuracy'])
  })

  test('an all-zero-weight rubric falls back to the defaults', () => {
    const resolved = resolveRubricDimensions({
      dimensions: [
        { name: 'clarity', weight: 0, isHardGate: false },
        { name: 'warmth', weight: 0, isHardGate: false },
      ],
    })

    expect(resolved).toHaveLength(9)
  })
})

describe('isReportHardGateDimension', () => {
  test('an empty list means the rubric gates nothing', () => {
    expect(isReportHardGateDimension('clarity', [])).toBe(false)
  })

  test('an absent list falls back to the defaults for old reports', () => {
    expect(isReportHardGateDimension('clarity', undefined)).toBe(true)
    expect(isReportHardGateDimension('warmth', undefined)).toBe(false)
  })

  test('a supplied list is authoritative', () => {
    expect(isReportHardGateDimension('subject_depth', ['subject_depth'])).toBe(
      true
    )
    expect(isReportHardGateDimension('clarity', ['subject_depth'])).toBe(false)
  })
})
