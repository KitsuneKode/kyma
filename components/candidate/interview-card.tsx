import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Surface } from '@/components/ui/surface'
import { StatusBadge } from '@/components/workspace/status-badge'
import { formatDateTime } from '@/lib/format/date'

type CandidateInterviewCardProps = {
  sessionId: string
  templateName: string
  status: string
  startedAt?: string
  inviteToken?: string
}

const ACTIVE_STATES = [
  'ready',
  'connecting',
  'live',
  'reconnecting',
  'interrupted',
]

export function CandidateInterviewCard(props: CandidateInterviewCardProps) {
  const normalizedStatus = props.status.toLowerCase()
  const isActive = ACTIVE_STATES.some((state) =>
    normalizedStatus.includes(state)
  )
  const isProcessing = normalizedStatus.includes('processing')

  return (
    <Surface
      elevation="default"
      padding="lg"
      className={isActive ? 'ring-primary/30' : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold tracking-tight">
          {props.templateName}
        </h3>
        <StatusBadge status={props.status} />
      </div>
      {props.startedAt ? (
        <p className="mt-3 font-mono text-xs text-muted-foreground tabular-nums">
          Started {formatDateTime(props.startedAt)}
        </p>
      ) : null}
      <div className="mt-5 flex gap-3">
        {isActive && props.inviteToken ? (
          <Button
            nativeButton={false}
            size="sm"
            className="active:scale-[0.96]"
            render={<Link href={`/interviews/${props.inviteToken}`} />}
          >
            Join interview
          </Button>
        ) : isProcessing ? (
          <Button size="sm" disabled className="active:scale-[0.96]">
            Processing…
          </Button>
        ) : (
          <Button
            nativeButton={false}
            size="sm"
            className="active:scale-[0.96]"
            render={<Link href={`/candidate/interviews/${props.sessionId}`} />}
          >
            View result
          </Button>
        )}
      </div>
    </Surface>
  )
}
