'use client'

import { useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { IconEye } from '@tabler/icons-react'

import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { formatDateTime } from '@/lib/recruiter/format'

type VisualObservation = FunctionReturnType<
  typeof api.visualObservations.listForSession
>[number]

type VideoEvidencePanelProps = {
  sessionId: string
  initialObservations?: VisualObservation[]
}

export function VideoEvidencePanel({
  sessionId,
  initialObservations,
}: VideoEvidencePanelProps) {
  const liveObservations = useQuery(
    api.visualObservations.listForSession,
    initialObservations || !sessionId
      ? 'skip'
      : {
          sessionId: sessionId as Id<'interviewSessions'>,
        }
  )
  const observations = initialObservations ?? liveObservations

  if (observations === undefined) {
    return (
      <WorkspaceSurface className="p-5">
        <p className="text-sm text-muted-foreground">Loading video evidence…</p>
      </WorkspaceSurface>
    )
  }

  if (observations.length === 0) {
    return null
  }

  return (
    <WorkspaceSurface className="p-0">
      <div className="border-b border-amber-400/20 bg-amber-400/10 px-5 py-3">
        <p className="text-sm font-medium text-amber-100">
          Review evidence only — not a score
        </p>
        <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
          Visual notes from the interview room are shown here for human review.
          They are not included in automated scoring or recommendations.
        </p>
      </div>

      <div className="space-y-0 divide-y divide-border/60">
        {observations.map((entry: VisualObservation) => (
          <article key={entry.id} className="px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
                <IconEye className="size-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-foreground">
                  {entry.observation}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDateTime(entry.observedAt)}
                  {entry.source === 'agent'
                    ? ' · Agent note'
                    : ' · System note'}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </WorkspaceSurface>
  )
}
