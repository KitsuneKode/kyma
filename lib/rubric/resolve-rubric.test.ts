import { describe, expect, test } from 'vitest'

import { hardGateNamesFrom, resolveRubricDimensions } from './resolve-rubric'

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
