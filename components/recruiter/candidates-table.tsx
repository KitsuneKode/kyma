'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconEye } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import {
  formatConfidenceLabel,
  formatDateTime,
  formatRecommendationLabel,
  formatStatusLabel,
} from '@/lib/recruiter/format'
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

const STATUS_FILTERS = ['all', 'pending', 'completed', 'manual_review'] as const
const RECOMMENDATION_FILTERS = [
  'all',
  'strong_yes',
  'yes',
  'maybe',
  'no',
  'strong_no',
] as const

function scoreChipColor(score?: number) {
  if (score === undefined) return 'bg-muted/30 text-muted-foreground'
  if (score <= 2.0) return 'bg-red-500/15 text-red-300'
  if (score <= 3.0) return 'bg-amber-500/15 text-amber-300'
  if (score <= 4.0) return 'bg-emerald-500/10 text-emerald-300'
  return 'bg-emerald-500/20 text-emerald-300 font-bold'
}

function statusPillColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-emerald-500/10 text-emerald-300'
    case 'manual_review':
      return 'bg-amber-500/15 text-amber-300'
    case 'pending':
    case 'in_progress':
      return 'bg-muted/30 text-muted-foreground'
    default:
      return 'bg-muted/30 text-muted-foreground'
  }
}

export function CandidatesTable({ data }: { data: CandidateRow[] }) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>('all')
  const [recFilter, setRecFilter] =
    useState<(typeof RECOMMENDATION_FILTERS)[number]>('all')

  const filtered = useMemo(() => {
    return data.filter((row) => {
      if (statusFilter !== 'all' && row.reportStatus !== statusFilter)
        return false
      if (recFilter !== 'all' && row.recommendation !== recFilter) return false
      return true
    })
  }, [data, statusFilter, recFilter])

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
          <div className="flex flex-col gap-1">
            <p className="font-medium">
              {formatRecommendationLabel(row.original.recommendation)}
            </p>
            <span
              className={cn(
                'inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold',
                statusPillColor(
                  row.original.latestDecision ?? row.original.reportStatus
                )
              )}
            >
              {formatStatusLabel(row.original.latestDecision ?? 'pending')}
            </span>
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
              scoreChipColor(row.original.weightedScore)
            )}
          >
            {typeof row.original.weightedScore === 'number'
              ? row.original.weightedScore.toFixed(1)
              : '—'}
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
              router.push(`/admin/candidates/${row.original.sessionId}`)
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
          options={STATUS_FILTERS}
          onChange={setStatusFilter}
        />
        <div className="mx-1 h-5 w-px bg-border/40" />
        <FilterGroup
          label="Rec"
          value={recFilter}
          options={RECOMMENDATION_FILTERS}
          onChange={setRecFilter}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        searchKey="candidateName"
        searchPlaceholder="Search candidate names"
        emptyMessage="No candidates match the current filters."
        onRowClick={(row) => {
          router.push(`/admin/candidates/${row.sessionId}`)
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
            'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-150',
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
