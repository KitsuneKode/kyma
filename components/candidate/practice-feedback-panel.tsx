'use client'

import Link from 'next/link'
import { useQuery } from 'convex/react'
import type { Id } from '@/convex/_generated/dataModel'

import { api } from '@/convex/_generated/api'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { WorkspaceQueryState } from '@/components/workspace/query-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function PracticeFeedbackPanel({
  sessionId,
}: {
  sessionId: Id<'interviewSessions'>
}) {
  const summary = useQuery(
    api.interviews.candidatePortal.getPracticeSessionSummary,
    { sessionId }
  )

  if (summary === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    )
  }

  if (summary === null) {
    return (
      <WorkspaceQueryState
        status="empty"
        emptyTitle="Practice session not found"
        emptyDescription="This practice session may have expired or belongs to another account."
        emptyAction={
          <Button
            nativeButton={false}
            render={<Link href="/candidate/practice" />}
          >
            Back to practice hub
          </Button>
        }
      />
    )
  }

  const status =
    summary.processingState === 'processing'
      ? 'loading'
      : summary.processingState === 'ready'
        ? 'ready'
        : 'empty'

  return (
    <section className="mx-auto w-full space-y-8">
      <WorkspacePageHeader
        eyebrow="Practice feedback"
        title={summary.templateName}
        description="Private learning feedback from your practice interview. This is not a hiring decision."
      />

      <WorkspaceQueryState
        status={status}
        loadingLabel="Generating practice feedback…"
        emptyTitle="Feedback not ready yet"
        emptyDescription="Complete the practice interview and wait a moment while we prepare your learning summary."
        emptyAction={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/candidate/practice" />}
          >
            Start another practice
          </Button>
        }
      >
        <div className="space-y-6">
          {summary.strengths.length > 0 ? (
            <WorkspaceSurface className="space-y-3 p-6">
              <p className="text-xs font-semibold tracking-[0.18em] text-emerald-600 uppercase dark:text-emerald-400">
                What went well
              </p>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {summary.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </WorkspaceSurface>
          ) : null}

          {summary.focusAreas.length > 0 ? (
            <WorkspaceSurface className="space-y-3 p-6">
              <p className="text-xs font-semibold tracking-[0.18em] text-amber-600 uppercase dark:text-amber-400">
                Focus next time
              </p>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {summary.focusAreas.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </WorkspaceSurface>
          ) : null}

          <WorkspaceSurface className="space-y-3 p-6">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Tips for your next rep
            </p>
            <ul className="space-y-3">
              {summary.tips.map((tip) => (
                <li
                  key={tip}
                  className="rounded-xl bg-muted/20 px-4 py-3 text-sm leading-relaxed text-muted-foreground"
                >
                  {tip}
                </li>
              ))}
            </ul>
          </WorkspaceSurface>

          <Button
            nativeButton={false}
            render={<Link href="/candidate/practice" />}
          >
            Practice again
          </Button>
        </div>
      </WorkspaceQueryState>
    </section>
  )
}
