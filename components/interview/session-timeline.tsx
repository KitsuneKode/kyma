'use client'

import { type SessionEvent } from '@/lib/interview/types'

type SessionTimelineProps = {
  events: SessionEvent[]
}

export function SessionTimeline({ events }: SessionTimelineProps) {
  return (
    <section className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
      <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        Session Timeline
      </p>
      <div className="mt-4 space-y-3">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Session events will appear here as the room progresses.
          </p>
        ) : (
          events.map((event) => (
            <div
              key={`${event.type}-${event.createdAt}`}
              className="rounded-xl border border-border/80 bg-background/70 px-4 py-3 shadow-sm"
            >
              <p className="text-sm font-medium">{event.type}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {event.detail}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
