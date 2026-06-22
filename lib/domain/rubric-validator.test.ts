import { describe, expect, test } from 'vitest'

import { RUBRIC_DIMENSIONS } from '@/lib/rubric/constants'

describe('rubric dimension validator contract', () => {
  test('Convex rubric validator literals match canonical dimensions', async () => {
    const { rubricDimensionValidator } = await import('@/convex/validators')

    const members = rubricDimensionValidator.members.map(
      (member: { value: string }) => member.value
    )

    expect(members.toSorted()).toEqual([...RUBRIC_DIMENSIONS].toSorted())
  })
})
