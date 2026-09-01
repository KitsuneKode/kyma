import { ConvexError } from 'convex/values'

export const MAX_CANDIDATES_PER_SCREENING_BATCH = 500
export const MAX_SCREENING_BATCHES_PER_LIST = 100
export const SCREENING_OPS_LOOKUP_CONCURRENCY = 50

export function assertSupportedScreeningBatchSize(size: number) {
  if (size > MAX_CANDIDATES_PER_SCREENING_BATCH) {
    throw new ConvexError(
      `A screening batch has a supported maximum of ${MAX_CANDIDATES_PER_SCREENING_BATCH} candidates (attempted ${size}).`
    )
  }
}

export function assertLegacyScreeningBatchWithinLimit(size: number) {
  if (size > MAX_CANDIDATES_PER_SCREENING_BATCH) {
    throw new ConvexError(
      `Legacy screening batch exceeds ${MAX_CANDIDATES_PER_SCREENING_BATCH} candidates; run the screening batch counter migration before retrying.`
    )
  }
}
