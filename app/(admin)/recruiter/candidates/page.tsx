import { api } from '@/convex/_generated/api'
import {
  CandidateReviewAccessFallback,
  CandidateReviewPageClient,
} from '@/components/recruiter/candidate-review-page-client'
import type { ReviewCandidate } from '@/components/recruiter/candidate-review-queue'
import { parseCandidateQueueFilters } from '@/lib/recruiter/candidate-queue-filters'
import { serverConvexQuery } from '@/lib/convex/server-query'

const QUEUE_PAGE_SIZE = 25

type AdminCandidatesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminCandidatesPage({
  searchParams,
}: AdminCandidatesPageProps) {
  const params = await searchParams
  const filters = parseCandidateQueueFilters(
    new URLSearchParams(
      Object.entries(params).flatMap(([key, value]) =>
        value === undefined
          ? []
          : Array.isArray(value)
            ? value.map((entry) => [key, entry] as [string, string])
            : [[key, value] as [string, string]]
      )
    )
  )

  const queryArgs = {
    paginationOpts: { numItems: QUEUE_PAGE_SIZE, cursor: null },
    statusFilter: filters.status,
    recommendationFilter: filters.recommendation,
  }

  const [candidatesResult, statsResult] = await Promise.all([
    serverConvexQuery(api.recruiter.candidates.listReviewCandidates, queryArgs),
    serverConvexQuery(api.recruiter.candidates.getCandidateQueueStats, {}),
  ])

  if (!candidatesResult.ok) {
    return (
      <CandidateReviewAccessFallback
        kind={candidatesResult.kind}
        message={candidatesResult.message}
      />
    )
  }

  const initialCandidates = candidatesResult.data.page as ReviewCandidate[]
  const stats = statsResult.ok ? statsResult.data : null

  return (
    <CandidateReviewPageClient
      initialCandidates={initialCandidates}
      filters={filters}
      stats={stats}
      statsFailed={!statsResult.ok}
      statsErrorMessage={statsResult.ok ? undefined : statsResult.message}
    />
  )
}
