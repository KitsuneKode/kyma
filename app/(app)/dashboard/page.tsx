import { fetchMutation, fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import { CandidateInterviewCard } from '@/components/candidate/interview-card'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'

export default async function DashboardPage() {
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
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Candidate dashboard</h1>
      {interviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No interviews linked to your account yet.
        </p>
      ) : (
        interviews.map((item) => (
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
