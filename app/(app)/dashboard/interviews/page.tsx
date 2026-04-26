import { fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import { CandidateInterviewCard } from '@/components/candidate/interview-card'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'

export default async function DashboardInterviewsPage() {
  const token = await getServerConvexAuthToken()
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
      <h1 className="text-2xl font-semibold">All interviews</h1>
      {interviews.map((item) => (
        <CandidateInterviewCard
          key={`${item.sessionId}`}
          sessionId={`${item.sessionId}`}
          title={item.candidateName ?? 'Interview'}
          status={item.status}
          startedAt={item.startedAt}
          inviteToken={item.inviteToken}
        />
      ))}
    </section>
  )
}
