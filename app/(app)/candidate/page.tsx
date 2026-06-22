import { fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import { CandidateEmptyState } from '@/components/candidate/candidate-empty-state'
import { CandidateInterviewCard } from '@/components/candidate/interview-card'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import {
  isActiveStatus,
  isPendingRelease,
} from '@/lib/candidate/status-filters'
import { timestampOf } from '@/lib/format/date'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'
import { runConvexFetch } from '@/lib/convex/server-fetch'

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
  const token = await getServerConvexAuthToken()
  const interviewsResult =
    clientEnv.NEXT_PUBLIC_CONVEX_URL && token
      ? await runConvexFetch(() =>
          fetchQuery(
            api.interviews.listCandidateInterviews,
            {},
            { token: token ?? undefined }
          )
        )
      : { ok: true as const, data: [] }

  const interviews = interviewsResult.ok ? interviewsResult.data : []

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

      {prioritizedInterviews.length === 0 ? (
        <CandidateEmptyState />
      ) : (
        <div className="relative space-y-16 before:absolute before:inset-y-0 before:left-[19px] before:w-[2px] before:bg-border/30">
          <section className="relative">
            <div className="absolute top-1 left-0 flex size-10 items-center justify-center rounded-full bg-background ring-4 ring-background">
              <div className="size-3 rounded-full bg-primary ring-4 ring-primary/20" />
            </div>
            <div className="pl-16">
              <h2 className="text-xs font-bold tracking-widest text-primary uppercase">
                Active
              </h2>
              <div className="mt-6 flex flex-col gap-4">
                {active.length === 0 ? (
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
                    />
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="relative">
            <div className="absolute top-1 left-0 flex size-10 items-center justify-center rounded-full bg-background ring-4 ring-background">
              <div className="size-3 rounded-full bg-muted-foreground/40 ring-4 ring-muted-foreground/10" />
            </div>
            <div className="pl-16">
              <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Pending release
              </h2>
              <div className="mt-6 flex flex-col gap-4">
                {pendingRelease.length === 0 ? (
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
                    />
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="relative">
            <div className="absolute top-1 left-0 flex size-10 items-center justify-center rounded-full bg-background ring-4 ring-background">
              <div className="size-3 rounded-full bg-emerald-500/60 ring-4 ring-emerald-500/10" />
            </div>
            <div className="pl-16">
              <h2 className="text-xs font-bold tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
                Released
              </h2>
              <div className="mt-6 flex flex-col gap-4">
                {released.length === 0 ? (
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
                    />
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
