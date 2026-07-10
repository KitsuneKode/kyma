'use client'

import { useMemo, useState, useTransition } from 'react'
import { IconCheck, IconCopy, IconMail } from '@tabler/icons-react'
import { useRouter } from 'next/navigation'

import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/workspace/status-badge'
import { formatStatusLabel } from '@/lib/recruiter/format'
import { sendBatchInviteEmails } from '@/lib/recruiter/send-batch-invite-emails'

type ScreeningCandidateRow = {
  id: string
  inviteId?: string
  candidateName: string
  candidateEmail?: string
  status: string
  inviteStatus: string
  attemptCount: number
  allowedAttempts: number
  inviteToken?: string
  isStuckProcessing?: boolean
  emailDeliveryStatus?: string
  emailSentAt?: string
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

function emailStatusLabel(status?: string) {
  if (!status) {
    return 'Not sent'
  }
  return formatStatusLabel(status)
}

export function ScreeningCandidatesTable({
  data,
  batchId,
}: {
  data: ScreeningCandidateRow[]
  batchId?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [sendMessage, setSendMessage] = useState<string | null>(null)

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
                <StatusBadge
                  status="processing"
                  label="Stuck"
                  className="text-xs"
                />
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Invite {formatStatusLabel(row.original.inviteStatus)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'emailDeliveryStatus',
        header: 'Email',
        cell: ({ row }) => (
          <p className="text-xs text-muted-foreground">
            {emailStatusLabel(row.original.emailDeliveryStatus)}
          </p>
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

  function handleResend() {
    if (!batchId) {
      return
    }
    setSendMessage(null)
    startTransition(async () => {
      const result = await sendBatchInviteEmails(batchId)
      if (!result.ok) {
        setSendMessage(result.error)
        return
      }
      setSendMessage(
        `Email: ${result.sent} sent, ${result.skipped} skipped, ${result.failed} failed.`
      )
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {batchId ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleResend}
          >
            <IconMail className="size-3.5" />
            {isPending ? 'Sending…' : 'Send / resend invite emails'}
          </Button>
          {sendMessage ? (
            <p className="text-xs text-muted-foreground">{sendMessage}</p>
          ) : null}
        </div>
      ) : null}
      <DataTable
        columns={columns}
        data={data}
        searchKey="candidateName"
        searchPlaceholder="Search candidates"
        emptyMessage="No candidates are in this batch yet. Add candidates to issue invite links."
      />
    </div>
  )
}
