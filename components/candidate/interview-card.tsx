import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Surface } from '@/components/ui/surface'
import {
  formatRecommendationLabel,
  formatStatusLabel,
} from '@/lib/recruiter/format'

type CandidateInterviewCardProps = {
  sessionId: string
  templateName: string
  status: string
  startedAt?: string
  inviteToken?: string
}

function statusBadgeClass(status: string) {
  const s = status.toLowerCase()
  if (
    s === 'no' ||
    s.includes('fail') ||
    s.includes('expired') ||
    s.includes('reject')
  ) {
    return 'bg-red-500/15 text-red-400'
  }
  if (
    s === 'mixed' ||
    s.includes('pending') ||
    s.includes('processing') ||
    s.includes('manual_review') ||
    s.includes('interrupted')
  ) {
    return 'bg-amber-500/15 text-amber-400'
  }
  return 'bg-emerald-500/15 text-emerald-400'
}

function displayLabel(status: string) {
  if (['strong_yes', 'yes', 'mixed', 'no'].includes(status)) {
    return formatRecommendationLabel(status)
  }
  return formatStatusLabel(status)
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
      elevation="raised"
      interactive
      padding="lg"
      className="transition-transform duration-150 ease-out hover:-translate-y-px"
    >
      <h3 className="text-base font-semibold">{props.templateName}</h3>
      <div className="mt-3">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${statusBadgeClass(props.status)}`}
        >
          {displayLabel(props.status)}
        </span>
      </div>
      {props.startedAt ? (
        <p className="mt-3 text-sm text-muted-foreground tabular-nums">
          Started: {new Date(props.startedAt).toLocaleString()}
        </p>
      ) : null}
      <div className="mt-4 flex gap-3">
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
