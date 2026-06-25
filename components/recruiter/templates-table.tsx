'use client'

import { useMemo, useState, useTransition } from 'react'
import { useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { api } from '@/convex/_generated/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { StatusBadge } from '@/components/workspace/status-badge'
import { formatDateTime } from '@/lib/recruiter/format'
import {
  JOB_FAMILY_LABELS,
  type JobFamily,
} from '@/lib/templates/job-family-starters'

export type TemplateLibraryRow = {
  id: string
  name: string
  role: string
  status: string
  jobFamily?: JobFamily
  targetDurationMinutes?: number
  updatedAt?: number
}

function formatJobFamilyLabel(jobFamily?: JobFamily) {
  if (!jobFamily) {
    return 'Unassigned'
  }
  return JOB_FAMILY_LABELS[jobFamily]
}

function formatLastEdited(updatedAt?: number) {
  if (!updatedAt) {
    return 'Not available'
  }
  return formatDateTime(new Date(updatedAt).toISOString())
}

export function TemplatesTable({ data }: { data: TemplateLibraryRow[] }) {
  const router = useRouter()
  const duplicateFromStarter = useMutation(
    api.recruiter.templates.duplicateTemplateFromStarter
  )
  const [isDuplicating, startTransition] = useTransition()
  const [duplicatingFamily, setDuplicatingFamily] = useState<JobFamily | null>(
    null
  )
  const [starterMenuOpen, setStarterMenuOpen] = useState(false)

  const columns = useMemo<ColumnDef<TemplateLibraryRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => <p className="font-medium">{row.original.name}</p>,
      },
      {
        accessorKey: 'jobFamily',
        header: 'Job family',
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.jobFamily ?? 'custom'}
            label={formatJobFamilyLabel(row.original.jobFamily)}
            className="bg-sky-500/15 text-sky-800 dark:text-sky-200"
          />
        ),
      },
      {
        accessorKey: 'role',
        header: 'Role',
      },
      {
        accessorKey: 'targetDurationMinutes',
        header: 'Duration',
        cell: ({ row }) => (
          <p className="tabular-nums">
            {row.original.targetDurationMinutes
              ? `${row.original.targetDurationMinutes} min`
              : '—'}
          </p>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'updatedAt',
        header: 'Last edited',
        cell: ({ row }) => (
          <p className="text-muted-foreground tabular-nums">
            {formatLastEdited(row.original.updatedAt)}
          </p>
        ),
      },
    ],
    []
  )

  async function handleDuplicate(jobFamily: JobFamily) {
    setDuplicatingFamily(jobFamily)
    setStarterMenuOpen(false)
    startTransition(async () => {
      try {
        const templateId = await duplicateFromStarter({ jobFamily })
        toast.success(
          `Created template from ${JOB_FAMILY_LABELS[jobFamily]} starter`
        )
        router.push(`/recruiter/templates/${templateId}/edit`)
        router.refresh()
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Unable to duplicate template from starter.'
        )
      } finally {
        setDuplicatingFamily(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Popover open={starterMenuOpen} onOpenChange={setStarterMenuOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" disabled={isDuplicating}>
                {isDuplicating ? 'Creating…' : 'Duplicate from starter'}
              </Button>
            }
          />
          <PopoverContent align="end" className="w-56 space-y-1 p-2">
            {(Object.keys(JOB_FAMILY_LABELS) as JobFamily[]).map(
              (jobFamily) => (
                <Button
                  key={jobFamily}
                  variant="ghost"
                  className="w-full justify-start"
                  disabled={isDuplicating && duplicatingFamily === jobFamily}
                  onClick={() => void handleDuplicate(jobFamily)}
                >
                  {JOB_FAMILY_LABELS[jobFamily]}
                </Button>
              )
            )}
          </PopoverContent>
        </Popover>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchKey="name"
        searchPlaceholder="Search template names"
        emptyMessage="No templates yet. Create a template or duplicate one from a job-family starter."
        onRowClick={(row) => {
          router.push(`/recruiter/templates/${row.id}/edit`)
        }}
      />
    </div>
  )
}
