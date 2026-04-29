import { fetchMutation, fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import { CandidateInterviewCard } from '@/components/candidate/interview-card'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'

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

function isActiveStatus(status: string) {
  return [
    'ready',
    'connecting',
    'live',
    'reconnecting',
    'interrupted',
  ].includes(status)
}

function isPendingRelease(item: {
  status: string
  reportStatus?: string
  released: boolean
}) {
  if (item.released) {
    return false
  }

  return (
    item.status === 'processing' ||
    item.reportStatus === 'processing' ||
    item.reportStatus === 'manual_review'
  )
}

export default async function CandidateHomePage() {
  const token = await getServerConvexAuthToken()
  if (clientEnv.NEXT_PUBLIC_CONVEX_URL && token) {
    await fetchMutation(
      api.interviews.linkCandidateInviteByEmail,
      {},
      { token: token ?? undefined }
    ).catch(() => null)
  }

  const interviews =
    clientEnv.NEXT_PUBLIC_CONVEX_URL && token
      ? await fetchQuery(
          api.interviews.listCandidateInterviews,
          {},
          { token: token ?? undefined }
        ).catch(() => [])
      : []

  const prioritizedInterviews = interviews.toSorted((a, b) => {
    const weightDiff = stateWeight(a.status) - stateWeight(b.status)
    if (weightDiff !== 0) return weightDiff
    return (
      (b.startedAt ? new Date(b.startedAt).getTime() : 0) -
      (a.startedAt ? new Date(a.startedAt).getTime() : 0)
    )
  })
  const active = prioritizedInterviews.filter((item) =>
    isActiveStatus(item.status)
  )
  const pendingRelease = prioritizedInterviews.filter((item) =>
    isPendingRelease(item)
  )
  const released = prioritizedInterviews.filter((item) => item.released)

  return (
    <section className="mx-auto w-full max-w-4xl space-y-12">
      <header className="space-y-4 text-center sm:text-left">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Candidate dashboard
        </h1>
        <p className="text-base text-muted-foreground">
          Track active interviews first, then review pending and released
          outcomes.
        </p>
      </header>

      {prioritizedInterviews.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-[2rem] bg-card p-5 text-center shadow-2xl ring-1 ring-border/20">
          <p className="text-sm font-medium text-muted-foreground">
            No interviews are linked to your account yet.
          </p>
        </div>
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
                    <div
                      key={`${item.sessionId}`}
                      className="rounded-2xl bg-card shadow-lg ring-1 ring-border/20 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-xl hover:ring-border/40"
                    >
                      <CandidateInterviewCard
                        sessionId={`${item.sessionId}`}
                        templateName={item.templateName ?? 'Interview'}
                        status={item.status}
                        startedAt={item.startedAt}
                        inviteToken={item.inviteToken}
                      />
                    </div>
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
                    <div
                      key={`${item.sessionId}`}
                      className="rounded-2xl bg-card/60 opacity-80 shadow-md ring-1 ring-border/10 transition-[transform,opacity,box-shadow] hover:-translate-y-0.5 hover:opacity-100 hover:shadow-lg hover:ring-border/30"
                    >
                      <CandidateInterviewCard
                        sessionId={`${item.sessionId}`}
                        templateName={item.templateName ?? 'Interview'}
                        status={item.reportStatus ?? item.status}
                        startedAt={item.startedAt}
                        inviteToken={item.inviteToken}
                      />
                    </div>
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
              <h2 className="text-xs font-bold tracking-widest text-emerald-500 uppercase">
                Released
              </h2>
              <div className="mt-6 flex flex-col gap-4">
                {released.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60">
                    No released outcomes yet.
                  </p>
                ) : (
                  released.map((item) => (
                    <div
                      key={`${item.sessionId}`}
                      className="rounded-2xl bg-card shadow-lg ring-1 ring-border/20 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-xl hover:ring-border/40"
                    >
                      <CandidateInterviewCard
                        sessionId={`${item.sessionId}`}
                        templateName={item.templateName ?? 'Interview'}
                        status={item.reportStatus ?? item.status}
                        startedAt={item.startedAt}
                        inviteToken={item.inviteToken}
                      />
                    </div>
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
