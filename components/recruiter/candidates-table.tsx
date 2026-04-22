'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'

import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import {
  formatConfidenceLabel,
  formatDateTime,
  formatRecommendationLabel,
  formatStatusLabel,
} from '@/lib/recruiter/format'

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

  const columns = useMemo<ColumnDef<CandidateRow>[]>(
    () => [
      {
        accessorKey: 'candidateName',
        header: 'Candidate',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.candidateName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {row.original.templateName}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'recommendation',
        header: 'Recommendation',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">
              {formatRecommendationLabel(row.original.recommendation)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Review{' '}
              {formatStatusLabel(row.original.latestDecision ?? 'pending')}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'startedAt',
        header: 'Session date',
        cell: ({ row }) => (
          <div>
            <p className="tabular-nums">
              {formatDateTime(row.original.startedAt)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Session {formatStatusLabel(row.original.sessionState)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'reportStatus',
        header: 'Report',
        cell: ({ row }) => (
          <div>
            <p>{formatStatusLabel(row.original.reportStatus)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {typeof row.original.weightedScore === 'number'
                ? `Score ${row.original.weightedScore.toFixed(1)}`
                : 'Score pending'}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'confidence',
        header: 'Confidence',
        cell: ({ row }) => (
          <p className="tabular-nums">
            {formatConfidenceLabel(row.original.confidence)}
          </p>
        ),
      },
    ],
    []
  )

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="candidateName"
      searchPlaceholder="Search candidate names"
      emptyMessage="No candidates yet. Run a demo interview to populate this queue."
      onRowClick={(row) => {
        router.push(`/admin/candidates/${row.sessionId}`)
      }}
    />
  )
}
