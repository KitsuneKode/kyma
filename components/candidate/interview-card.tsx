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
  return (
    <article className="rounded-2xl border bg-card p-5">
      <h3 className="text-base font-semibold">{props.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Status: {props.status}
      </p>
      {props.startedAt ? (
        <p className="text-sm text-muted-foreground">
          Started: {new Date(props.startedAt).toLocaleString()}
        </p>
      ) : null}
      <div className="mt-4 flex gap-3">
        <Button
          nativeButton={false}
          size="sm"
          render={<Link href={`/dashboard/interviews/${props.sessionId}`} />}
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
