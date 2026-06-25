'use client'

import { SessionActivityLivelineBoundary } from '@/components/recruiter/session-activity-liveline'
import { formatDateTime, formatStatusLabel } from '@/lib/recruiter/format'
import {
  useReviewActions,
  useReviewPlayback,
} from '@/components/recruiter/review-context'

type ReviewTimelinePanelProps = {
  events: Array<{
    id: string
    type: string
    detail: string
    createdAt: string
  }>
  sessionStartAt?: string | null
}

export function ReviewTimelinePanel({
  events,
  sessionStartAt,
}: ReviewTimelinePanelProps) {
  const { currentTime } = useReviewPlayback()
  const { jumpToTime } = useReviewActions()

  return (
    <div className="flex flex-col gap-5">
      <SessionActivityLivelineBoundary
        events={events}
        sessionStartAt={sessionStartAt}
        currentTimeSec={currentTime}
        onHoverTime={jumpToTime}
      />
      <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-2xl bg-muted/35 px-4 py-3 ring-1 ring-border/50"
          >
            <p className="font-medium">{formatStatusLabel(event.type)}</p>
            <p className="mt-2 text-sm text-muted-foreground">{event.detail}</p>
            <p className="mt-2 font-mono text-xs text-muted-foreground tabular-nums">
              {formatDateTime(event.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
