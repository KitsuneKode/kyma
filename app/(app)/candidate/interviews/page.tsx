import { fetchQuery } from 'convex/nextjs'
import Link from 'next/link'

import { api } from '@/convex/_generated/api'
import { CandidateEmptyState } from '@/components/candidate/candidate-empty-state'
import { CandidateInterviewCard } from '@/components/candidate/interview-card'
import { Button } from '@/components/ui/button'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'
import { runConvexFetch } from '@/lib/convex/server-fetch'

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
  const interviewsResult =
    clientEnv.NEXT_PUBLIC_CONVEX_URL && token
      ? await runConvexFetch(() =>
          fetchQuery(
            api.interviews.candidatePortal.listCandidateInterviews,
            {},
            { token: token ?? undefined }
          )
        )
      : { ok: true as const, data: [] }

  const interviews = interviewsResult.ok ? interviewsResult.data : []
  const filtered = interviews.filter((interview) => inFilter(filter, interview))

  return (
    <section className="space-y-8">
      <WorkspacePageHeader
        eyebrow="Your interviews"
        title="All interviews"
        description="Filter by active sessions, pending release, or released outcomes."
      />
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
        interviews.length === 0 ? (
          <CandidateEmptyState />
        ) : (
          <WorkspaceSurface className="p-5">
            <p className="text-sm text-muted-foreground">
              No interviews match this filter.
            </p>
          </WorkspaceSurface>
        )
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((item) => (
            <CandidateInterviewCard
              key={`${item.sessionId}`}
              sessionId={`${item.sessionId}`}
              templateName={item.templateName ?? 'Interview'}
              status={item.reportStatus ?? item.status}
              startedAt={item.startedAt}
              inviteToken={item.inviteToken}
            />
          ))}
        </div>
      )}
    </section>
  )
}
