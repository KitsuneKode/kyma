'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { IconEye } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/workspace/status-badge'
import {
  buildCandidateQueueSearchParams,
  CANDIDATE_RECOMMENDATION_FILTERS,
  CANDIDATE_STATUS_FILTERS,
  parseCandidateQueueFilters,
  type CandidateRecommendationFilter,
  type CandidateStatusFilter,
} from '@/lib/recruiter/candidate-queue-filters'
import {
  formatConfidenceLabel,
  formatDateTime,
  formatRecommendationLabel,
  formatStatusLabel,
} from '@/lib/recruiter/format'
import { scoreColor, formatScoreValue } from '@/lib/ui/score-format'
import { cn } from '@/lib/utils'

type CandidateRow = {
  sessionId: string
  candidateName: string
  templateName: string
  inviteToken?: string
  sessionState: string
  startedAt?: string
  reportStatus: string
  weightedScore?: number
  recommendation?: string
  confidence?: string
  latestDecision?: string
}

export function CandidatesTable({ data }: { data: CandidateRow[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialFilters = useMemo(
    () => parseCandidateQueueFilters(searchParams),
    [searchParams]
  )

  const [statusFilter, setStatusFilter] = useState<CandidateStatusFilter>(
    initialFilters.status
  )
  const [recFilter, setRecFilter] = useState<CandidateRecommendationFilter>(
    initialFilters.recommendation
  )

  const syncFiltersToUrl = useCallback(
    (
      nextStatus: CandidateStatusFilter,
      nextRec: CandidateRecommendationFilter
    ) => {
      const params = buildCandidateQueueSearchParams({
        status: nextStatus,
        recommendation: nextRec,
      })
      const query = params.toString()
      router.replace(
        query ? `/recruiter/candidates?${query}` : '/recruiter/candidates',
        { scroll: false }
      )
    },
    [router]
  )

  const handleStatusChange = useCallback(
    (value: CandidateStatusFilter) => {
      setStatusFilter(value)
      syncFiltersToUrl(value, recFilter)
    },
    [recFilter, syncFiltersToUrl]
  )

  const handleRecChange = useCallback(
    (value: CandidateRecommendationFilter) => {
      setRecFilter(value)
      syncFiltersToUrl(statusFilter, value)
    },
    [statusFilter, syncFiltersToUrl]
  )

  const filtered = data

  const columns = useMemo<ColumnDef<CandidateRow>[]>(
    () => [
      {
        accessorKey: 'candidateName',
        header: 'Candidate',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.candidateName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {row.original.templateName}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'recommendation',
        header: 'Recommendation',
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1.5">
            <p className="font-medium">
              {formatRecommendationLabel(row.original.recommendation)}
            </p>
            <StatusBadge
              status={row.original.latestDecision ?? row.original.reportStatus}
              label={formatStatusLabel(
                row.original.latestDecision ?? 'pending'
              )}
              className="px-2 py-0.5 text-[10px]"
            />
          </div>
        ),
      },
      {
        accessorKey: 'weightedScore',
        header: 'Score',
        cell: ({ row }) => (
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums',
              scoreColor(row.original.weightedScore)
            )}
          >
            {formatScoreValue(row.original.weightedScore)}
          </span>
        ),
      },
      {
        accessorKey: 'startedAt',
        header: 'Date',
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums">
            {formatDateTime(row.original.startedAt)}
          </span>
        ),
      },
      {
        accessorKey: 'confidence',
        header: 'Confidence',
        cell: ({ row }) => (
          <span className="text-xs tabular-nums">
            {formatConfidenceLabel(row.original.confidence)}
          </span>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-full opacity-0 group-hover/row:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/recruiter/candidates/${row.original.sessionId}`)
            }}
          >
            <IconEye className="size-3.5" />
          </Button>
        ),
      },
    ],
    [router]
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <FilterGroup
          label="Status"
          value={statusFilter}
          options={CANDIDATE_STATUS_FILTERS}
          onChange={handleStatusChange}
        />
        <div className="mx-1 h-5 w-px bg-border/40" />
        <FilterGroup
          label="Rec"
          value={recFilter}
          options={CANDIDATE_RECOMMENDATION_FILTERS}
          onChange={handleRecChange}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchKey="candidateName"
        searchPlaceholder="Search candidate names"
        emptyMessage="No candidates match the current filters."
        onRowClick={(row) => {
          router.push(`/recruiter/candidates/${row.sessionId}`)
        }}
      />
    </div>
  )
}

function FilterGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] font-medium tracking-wider text-muted-foreground/60 uppercase">
        {label}
      </span>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors transition-transform duration-150 active:scale-[0.96]',
            value === opt
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
          )}
        >
          {formatStatusLabel(opt)}
        </button>
      ))}
    </div>
  )
}
