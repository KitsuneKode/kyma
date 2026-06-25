import Link from 'next/link'

import { api } from '@/convex/_generated/api'
import { CandidateEmptyState } from '@/components/candidate/candidate-empty-state'
import { CandidateInterviewCard } from '@/components/candidate/interview-card'
import { CandidatePortalTimeline } from '@/components/candidate/candidate-portal-timeline'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  isActiveStatus,
  isPendingRelease,
} from '@/lib/candidate/status-filters'
import { timestampOf } from '@/lib/format/date'
import { serverConvexPortalQuery } from '@/lib/convex/server-query'

function stateWeight(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes('pending') || normalized.includes('scheduled')) {
    return 0
  }
  if (normalized.includes('in_progress')) {
    return 1
  }
  return 2
}

export default async function CandidateHomePage() {
  const interviewsResult = await serverConvexPortalQuery(
    api.interviews.candidatePortal.listCandidateInterviews,
    { purpose: 'screening' },
    []
  )
  const practiceResult = await serverConvexPortalQuery(
    api.interviews.candidatePortal.listRecentPracticeSessions,
    {},
    []
  )

  if (interviewsResult.status === 'error') {
    return (
      <section className="mx-auto w-full space-y-6">
        <WorkspacePageHeader
          eyebrow="Your interviews"
          title="Candidate dashboard"
          description="Track active interviews first, then review pending and released outcomes."
        />
        <Alert variant="destructive">
          <AlertTitle>Unable to load interviews</AlertTitle>
          <AlertDescription>{interviewsResult.message}</AlertDescription>
        </Alert>
        <Button nativeButton={false} render={<Link href="/candidate" />}>
          Retry
        </Button>
      </section>
    )
  }

  const interviews = interviewsResult.data
  const recentPractice =
    practiceResult.status === 'ok' ? practiceResult.data.slice(0, 2) : []

  const prioritizedInterviews = interviews.toSorted((a, b) => {
    const weightDiff = stateWeight(a.status) - stateWeight(b.status)
    if (weightDiff !== 0) return weightDiff
    return timestampOf(b.startedAt) - timestampOf(a.startedAt)
  })
  const active = prioritizedInterviews.filter((item) =>
    isActiveStatus(item.status)
  )
  const pendingRelease = prioritizedInterviews.filter((item) =>
    isPendingRelease(item)
  )
  const released = prioritizedInterviews.filter((item) => item.released)

  return (
    <section className="mx-auto w-full space-y-12">
      <WorkspacePageHeader
        eyebrow="Your interviews"
        title="Candidate dashboard"
        description="Track active interviews first, then review pending and released outcomes."
      />

      {recentPractice.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
              Recent practice
            </p>
            <Button
              nativeButton={false}
              variant="ghost"
              size="sm"
              render={<Link href="/candidate/practice" />}
            >
              View all practice
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {recentPractice.map((item) => (
              <CandidateInterviewCard
                key={`${item.sessionId}`}
                sessionId={`${item.sessionId}`}
                templateName={item.templateName}
                status={item.status}
                startedAt={item.startedAt}
                sessionPurpose="mock"
              />
            ))}
          </div>
        </section>
      ) : null}

      {prioritizedInterviews.length === 0 ? (
        <CandidateEmptyState />
      ) : (
        <CandidatePortalTimeline
          sections={[
            {
              key: 'active',
              markerClassName:
                'size-3 rounded-full bg-primary ring-4 ring-primary/20',
              title: 'Active',
              titleClassName:
                'text-xs font-bold tracking-widest text-primary uppercase',
              children:
                active.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60">
                    No active interviews right now.
                  </p>
                ) : (
                  active.map((item) => (
                    <CandidateInterviewCard
                      key={`${item.sessionId}`}
                      sessionId={`${item.sessionId}`}
                      templateName={item.templateName ?? 'Interview'}
                      status={item.status}
                      startedAt={item.startedAt}
                      inviteToken={item.inviteToken}
                      sessionPurpose={item.sessionPurpose}
                    />
                  ))
                ),
            },
            {
              key: 'pending',
              markerClassName:
                'size-3 rounded-full bg-muted-foreground/40 ring-4 ring-muted-foreground/10',
              title: 'Pending release',
              children:
                pendingRelease.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60">
                    No pending results.
                  </p>
                ) : (
                  pendingRelease.map((item) => (
                    <CandidateInterviewCard
                      key={`${item.sessionId}`}
                      sessionId={`${item.sessionId}`}
                      templateName={item.templateName ?? 'Interview'}
                      status={item.reportStatus ?? item.status}
                      startedAt={item.startedAt}
                      inviteToken={item.inviteToken}
                      sessionPurpose={item.sessionPurpose}
                    />
                  ))
                ),
            },
            {
              key: 'released',
              markerClassName:
                'size-3 rounded-full bg-emerald-500/60 ring-4 ring-emerald-500/10',
              title: 'Released',
              titleClassName:
                'text-xs font-bold tracking-widest text-emerald-600 uppercase dark:text-emerald-400',
              children:
                released.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60">
                    No released outcomes yet.
                  </p>
                ) : (
                  released.map((item) => (
                    <CandidateInterviewCard
                      key={`${item.sessionId}`}
                      sessionId={`${item.sessionId}`}
                      templateName={item.templateName ?? 'Interview'}
                      status={item.reportStatus ?? item.status}
                      startedAt={item.startedAt}
                      inviteToken={item.inviteToken}
                      sessionPurpose={item.sessionPurpose}
                    />
                  ))
                ),
            },
          ]}
        />
      )}
    </section>
  )
}
