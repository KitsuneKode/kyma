'use client'

import { useMemo, useState } from 'react'
import { IconCheck, IconCopy } from '@tabler/icons-react'

import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  isStuckProcessing?: boolean
}

function buildInviteUrl(token: string) {
  if (typeof window === 'undefined') {
    return `/i/${token}`
  }
  return `${window.location.origin}/i/${token}`
}

function CopyInviteButton({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0"
      onClick={() => void handleCopy()}
    >
      {copied ? (
        <>
          <IconCheck className="size-3.5" />
          Copied
        </>
      ) : (
        <>
          <IconCopy className="size-3.5" />
          Copy link
        </>
      )}
    </Button>
  )
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
            <div className="flex flex-wrap items-center gap-2">
              <p>{formatStatusLabel(row.original.status)}</p>
              {row.original.isStuckProcessing ? (
                <Badge variant="destructive">Stuck</Badge>
              ) : null}
            </div>
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
        header: 'Invite link',
        cell: ({ row }) => {
          if (!row.original.inviteToken) {
            return <span className="text-muted-foreground">Pending</span>
          }
          const inviteUrl = buildInviteUrl(row.original.inviteToken)
          return (
            <div className="flex max-w-md flex-col gap-2 sm:flex-row sm:items-center">
              <a
                href={inviteUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate font-mono text-xs text-primary underline-offset-4 hover:underline"
              >
                {inviteUrl}
              </a>
              <CopyInviteButton inviteUrl={inviteUrl} />
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
