import Link from 'next/link'

import { api } from '@/convex/_generated/api'
import { CandidateEmptyState } from '@/components/candidate/candidate-empty-state'
import { CandidateInterviewCard } from '@/components/candidate/interview-card'
import { Button } from '@/components/ui/button'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import { WorkspaceSurface } from '@/components/workspace/surface'
import {
  isActiveStatus,
  isPendingRelease,
} from '@/lib/candidate/status-filters'
import { serverConvexQueryWithFallback } from '@/lib/convex/server-query'

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
    return isActiveStatus(interview.status)
  }
  if (filter === 'pending_release') {
    return isPendingRelease(interview)
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
  const interviewsResult = await serverConvexQueryWithFallback(
    api.interviews.candidatePortal.listCandidateInterviews,
    {},
    []
  )

  const interviews = interviewsResult.ok ? interviewsResult.data : []
  const filtered = interviews.filter((interview) => inFilter(filter, interview))

  return (
    <section className="space-y-8">
      <WorkspacePageHeader
        eyebrow="Your interviews"
        title="All interviews"
        description="Filter by active, pending release, or released outcomes."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/candidate" />}
          >
            Back to dashboard
          </Button>
        }
      />

      <WorkspaceSurface className="flex flex-wrap gap-2 p-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'pending_release', label: 'Pending release' },
          { id: 'released', label: 'Released' },
        ].map((item) => (
          <Button
            key={item.id}
            nativeButton={false}
            size="sm"
            variant={filter === item.id ? 'default' : 'ghost'}
            render={<Link href={`/candidate/interviews?status=${item.id}`} />}
          >
            {item.label}
          </Button>
        ))}
      </WorkspaceSurface>

      {filtered.length === 0 ? (
        <CandidateEmptyState />
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
