import Link from 'next/link'

import { Button } from '@/components/ui/button'

type CandidateInterviewCardProps = {
  sessionId: string
  title: string
  status: string
  startedAt?: string
  inviteToken?: string
}

export function CandidateInterviewCard(props: CandidateInterviewCardProps) {
  const normalizedStatus = props.status.toLowerCase()
  const statusToneClass =
    normalizedStatus.includes('fail') || normalizedStatus.includes('expired')
      ? 'bg-red-500/15 text-red-400'
      : normalizedStatus.includes('pending') ||
          normalizedStatus.includes('processing')
        ? 'bg-amber-500/15 text-amber-400'
        : 'bg-emerald-500/15 text-emerald-400'

  return (
    <article className="rounded-2xl bg-card p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
      <h3 className="text-base font-semibold">{props.title}</h3>
      <div className="mt-3">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusToneClass}`}
        >
          {props.status}
        </span>
      </div>
      {props.startedAt ? (
        <p className="mt-3 text-sm text-muted-foreground tabular-nums">
          Started: {new Date(props.startedAt).toLocaleString()}
        </p>
      ) : null}
      <div className="mt-4 flex gap-3">
        <Button
          nativeButton={false}
          size="sm"
          render={<Link href={`/candidate/interviews/${props.sessionId}`} />}
        >
          View result
        </Button>
        {props.inviteToken ? (
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link href={`/interviews/${props.inviteToken}`} />}
          >
            Join
          </Button>
        ) : null}
      </div>
    </article>
  )
}
