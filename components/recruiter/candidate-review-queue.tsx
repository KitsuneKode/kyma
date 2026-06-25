'use client'

import type { FunctionReturnType } from 'convex/server'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { CandidatesTable } from '@/components/recruiter/candidates-table'
import { useAuthenticatedPaginatedQuery } from '@/lib/convex/use-authenticated-query'
import { parseCandidateQueueFilters } from '@/lib/recruiter/candidate-queue-filters'

const PAGE_SIZE = 25

export type ReviewCandidate = FunctionReturnType<
  typeof api.recruiter.candidates.listReviewCandidates
>['page'][number]

export function CandidateReviewQueue({
  initialCandidates,
}: {
  initialCandidates: ReviewCandidate[]
}) {
  const searchParams = useSearchParams()
  const filters = useMemo(
    () => parseCandidateQueueFilters(searchParams),
    [searchParams]
  )

  const { results, status, loadMore } = useAuthenticatedPaginatedQuery(
    api.recruiter.candidates.listReviewCandidates,
    {
      statusFilter: filters.status,
      recommendationFilter: filters.recommendation,
    },
    PAGE_SIZE
  )

  const filtersActive =
    filters.status !== 'all' || filters.recommendation !== 'all'

  // Render the SSR-provided first page until the reactive query has hydrated,
  // so there is no empty flash on initial paint.
  const candidates =
    results.length > 0 || filtersActive ? results : initialCandidates

  return (
    <div className="flex flex-col gap-4">
      <CandidatesTable data={candidates} />

      {status === 'CanLoadMore' || status === 'LoadingMore' ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={status === 'LoadingMore'}
            onClick={() => loadMore(PAGE_SIZE)}
          >
            {status === 'LoadingMore' ? 'Loading…' : 'Load more candidates'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
