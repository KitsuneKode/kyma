'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'

import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Progress } from '@/components/ui/progress'
import { formatDateTime, formatStatusLabel } from '@/lib/recruiter/format'
import { cn } from '@/lib/utils'

type ScreeningBatchRow = {
  id: string
  name: string
  status: string
  completedCount: number
  candidateCount: number
  completionPercent: number
  expiringInvites: number
  stuckCandidates: number
  expiresAt?: string
  templateName: string
  createdAt: string
}

export function ScreeningBatchesTable({ data }: { data: ScreeningBatchRow[] }) {
  const router = useRouter()

  const columns = useMemo<ColumnDef<ScreeningBatchRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Batch',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Created {formatDateTime(row.original.createdAt)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <p>{formatStatusLabel(row.original.status)}</p>,
      },
      {
        accessorKey: 'completionPercent',
        header: 'Completion',
        cell: ({ row }) => (
          <div className="flex min-w-32 flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
              <span>{row.original.completionPercent}%</span>
              <span className="text-muted-foreground">
                {row.original.completedCount}/{row.original.candidateCount}
              </span>
            </div>
            <Progress
              value={row.original.completionPercent}
              className="h-1.5"
            />
          </div>
        ),
      },
      {
        accessorKey: 'expiringInvites',
        header: 'Expiring',
        cell: ({ row }) => (
          <HealthCount
            count={row.original.expiringInvites}
            tone={row.original.expiringInvites > 0 ? 'warning' : 'neutral'}
            label="invites expiring within 24h"
          />
        ),
      },
      {
        accessorKey: 'stuckCandidates',
        header: 'Stuck',
        cell: ({ row }) => (
          <HealthCount
            count={row.original.stuckCandidates}
            tone={row.original.stuckCandidates > 0 ? 'danger' : 'neutral'}
            label="candidates with stale sessions"
          />
        ),
      },
      {
        accessorKey: 'expiresAt',
        header: 'Expiry',
        cell: ({ row }) => (
          <p className="tabular-nums">
            {formatDateTime(row.original.expiresAt)}
          </p>
        ),
      },
      {
        accessorKey: 'templateName',
        header: 'Template',
      },
    ],
    []
  )

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search batch names"
      emptyMessage="No screening batches yet. Create a screening batch to get started."
      onRowClick={(row) => {
        router.push(`/recruiter/screenings/${row.id}`)
      }}
    />
  )
}

function HealthCount({
  count,
  tone,
  label,
}: {
  count: number
  tone: 'neutral' | 'warning' | 'danger'
  label: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(
          'font-mono text-sm font-semibold tabular-nums',
          tone === 'warning' && 'text-amber-600 dark:text-amber-400',
          tone === 'danger' && 'text-destructive'
        )}
      >
        {count}
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}
