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

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">
        Candidate dashboard
      </h1>
      <p className="text-sm text-muted-foreground">
        Upcoming interviews are prioritized first so you can act quickly.
      </p>
      {prioritizedInterviews.length === 0 ? (
        <div className="rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
          No interviews linked to your account yet.
        </div>
      ) : (
        prioritizedInterviews.map((item) => (
          <CandidateInterviewCard
            key={`${item.sessionId}`}
            sessionId={`${item.sessionId}`}
            title={item.candidateName ?? 'Interview'}
            status={item.status}
            startedAt={item.startedAt}
            inviteToken={item.inviteToken}
          />
        ))
      )}
    </section>
  )
}
