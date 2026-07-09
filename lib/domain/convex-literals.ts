import { v } from 'convex/values'

/**
 * Build a Convex `v.union(v.literal(...), ...)` from a shared const array.
 * Keeps domain string unions and Convex validators in lockstep.
 *
 * Cast mirrors the previous RUBRIC_DIMENSIONS spread pattern so Convex
 * accepts a mutable validator member list.
 */
export function literalUnion<const T extends readonly [string, ...string[]]>(
  values: T
) {
  const literals = values.map((value) => v.literal(value)) as [
    ReturnType<typeof v.literal<T[number]>>,
    ...ReturnType<typeof v.literal<T[number]>>[],
  ]
  return v.union(...literals)
}
