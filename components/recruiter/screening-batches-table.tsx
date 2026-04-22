'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'

import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { formatDateTime, formatStatusLabel } from '@/lib/recruiter/format'

type ScreeningBatchRow = {
  id: string
  name: string
  status: string
  completedCount: number
  candidateCount: number
  expiresAt: string
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
        accessorKey: 'completedCount',
        header: 'Progress',
        cell: ({ row }) => (
          <p className="tabular-nums">
            {row.original.completedCount} / {row.original.candidateCount}
          </p>
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
        router.push(`/admin/screenings/${row.id}`)
      }}
    />
  )
}
