export const CANDIDATE_STATUS_FILTERS = [
  'all',
  'pending',
  'completed',
  'manual_review',
] as const

export const CANDIDATE_RECOMMENDATION_FILTERS = [
  'all',
  'strong_yes',
  'yes',
  'mixed',
  'no',
] as const

export type CandidateStatusFilter = (typeof CANDIDATE_STATUS_FILTERS)[number]
export type CandidateRecommendationFilter =
  (typeof CANDIDATE_RECOMMENDATION_FILTERS)[number]

export type CandidateQueueFilters = {
  status: CandidateStatusFilter
  recommendation: CandidateRecommendationFilter
}

const STATUS_SET = new Set<string>(CANDIDATE_STATUS_FILTERS)
const RECOMMENDATION_SET = new Set<string>(CANDIDATE_RECOMMENDATION_FILTERS)

function parseFilterValue<T extends string>(
  value: string | null | undefined,
  allowed: Set<string>,
  fallback: T
): T {
  if (!value || !allowed.has(value)) {
    return fallback
  }
  return value as T
}

export function parseCandidateQueueFilters(
  searchParams: URLSearchParams | { get: (key: string) => string | null }
): CandidateQueueFilters {
  return {
    status: parseFilterValue(searchParams.get('status'), STATUS_SET, 'all'),
    recommendation: parseFilterValue(
      searchParams.get('recommendation'),
      RECOMMENDATION_SET,
      'all'
    ),
  }
}

export function buildCandidateQueueSearchParams(
  filters: CandidateQueueFilters
): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.status !== 'all') {
    params.set('status', filters.status)
  }
  if (filters.recommendation !== 'all') {
    params.set('recommendation', filters.recommendation)
  }
  return params
}
