import { fetchQuery } from 'convex/nextjs'
import Link from 'next/link'

import { api } from '@/convex/_generated/api'
import { CandidateInterviewCard } from '@/components/candidate/interview-card'
import { Button } from '@/components/ui/button'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'

type CandidateInterviewsPageProps = {
  searchParams: Promise<{ status?: string }>
}

function inFilter(
  filter: string,
  interview: {
    status: string
    reportStatus?: string
    released: boolean
  }
) {
  if (filter === 'active') {
    return [
      'ready',
      'connecting',
      'live',
      'reconnecting',
      'interrupted',
    ].includes(interview.status)
  }
  if (filter === 'pending_release') {
    return (
      !interview.released &&
      (interview.status === 'processing' ||
        interview.reportStatus === 'processing' ||
        interview.reportStatus === 'manual_review')
    )
  }
  if (filter === 'released') {
    return interview.released
  }
  return true
}

export default async function CandidateInterviewsPage({
  searchParams,
}: CandidateInterviewsPageProps) {
  const { status } = await searchParams
  const filter = status ?? 'all'
  const token = await getServerConvexAuthToken()
  const interviews =
    clientEnv.NEXT_PUBLIC_CONVEX_URL && token
      ? await fetchQuery(
          api.interviews.listCandidateInterviews,
          {},
          { token: token ?? undefined }
        ).catch(() => [])
      : []
  const filtered = interviews.filter((interview) => inFilter(filter, interview))

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">All interviews</h1>
      <div className="flex flex-wrap gap-2">
        {[
          ['all', 'All'],
          ['active', 'Active'],
          ['pending_release', 'Pending release'],
          ['released', 'Released'],
        ].map(([value, label]) => (
          <Button
            key={value}
            nativeButton={false}
            size="sm"
            variant={filter === value ? 'default' : 'outline'}
            render={<Link href={`/candidate/interviews?status=${value}`} />}
          >
            {label}
          </Button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
          No interviews match this filter.
        </p>
      ) : (
        filtered.map((item) => (
          <CandidateInterviewCard
            key={`${item.sessionId}`}
            sessionId={`${item.sessionId}`}
            title={item.candidateName ?? 'Interview'}
            status={item.reportStatus ?? item.status}
            startedAt={item.startedAt}
            inviteToken={item.inviteToken}
          />
        ))
      )}
    </section>
  )
}
