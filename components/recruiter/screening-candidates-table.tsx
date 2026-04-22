'use client'

import { useMemo } from 'react'

import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { formatStatusLabel } from '@/lib/recruiter/format'

type ScreeningCandidateRow = {
  id: string
  candidateName: string
  candidateEmail?: string
  status: string
  inviteStatus: string
  attemptCount: number
  allowedAttempts: number
  inviteToken?: string
}

export function ScreeningCandidatesTable({
  data,
}: {
  data: ScreeningCandidateRow[]
}) {
  const columns = useMemo<ColumnDef<ScreeningCandidateRow>[]>(
    () => [
      {
        accessorKey: 'candidateName',
        header: 'Candidate',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.candidateName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {row.original.candidateEmail ?? 'No email available'}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Eligibility',
        cell: ({ row }) => (
          <div>
            <p>{formatStatusLabel(row.original.status)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Invite {formatStatusLabel(row.original.inviteStatus)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'attemptCount',
        header: 'Attempts',
        cell: ({ row }) => (
          <p className="tabular-nums">
            {row.original.attemptCount} / {row.original.allowedAttempts}
          </p>
        ),
      },
      {
        accessorKey: 'inviteToken',
        header: 'Invite path',
        cell: ({ row }) => {
          if (!row.original.inviteToken) {
            return <span className="text-muted-foreground">Pending</span>
          }
          const inviteUrl = `/interviews/${row.original.inviteToken}`
          return (
            <div className="flex items-center gap-2">
              <a
                href={inviteUrl}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-primary transition-colors hover:bg-primary/20"
              >
                <span>{row.original.inviteToken}</span>
                <span className="opacity-0 transition-opacity group-hover:opacity-100">
                  →
                </span>
              </a>
            </div>
          )
        },
      },
    ],
    []
  )

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="candidateName"
      searchPlaceholder="Search candidates"
      emptyMessage="No candidates are in this batch yet. Add candidates to issue invite links."
    />
  )
}
