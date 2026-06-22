import type { Id } from '@/convex/_generated/dataModel'
import Link from 'next/link'

import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import {
  formatDateTime,
  formatRecommendationLabel,
} from '@/lib/recruiter/format'
import { formatScoreValue, scoreColor } from '@/lib/ui/score-format'
import { cn } from '@/lib/utils'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import { WorkspaceSurface } from '@/components/workspace/surface'
import {
  hasConvexDeployment,
  serverConvexQuery,
} from '@/lib/convex/server-query'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'

type InterviewResultPageProps = {
  params: Promise<{ id: string }>
}

export default async function CandidateInterviewResultPage({
  params,
}: InterviewResultPageProps) {
  const [{ id }, token] = await Promise.all([
    params,
    getServerConvexAuthToken(),
  ])
  const resultFetch =
    hasConvexDeployment() && token
      ? await serverConvexQuery(
          api.interviews.candidatePortal.getCandidateInterviewResult,
          { sessionId: id as Id<'interviewSessions'> }
        )
      : { ok: false as const, kind: 'unknown' as const }

  const result = resultFetch.ok ? resultFetch.data : null

  return (
    <section className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Interview outcome"
        title="Interview result"
        description="Review your released outcome or current processing status."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link href="/candidate/interviews" />}
          >
            Back to interviews
          </Button>
        }
      />

      {!resultFetch.ok || !result ? (
        <WorkspaceSurface className="p-5">
          <p className="text-sm text-muted-foreground">
            {resultFetch.ok
              ? 'This result could not be loaded. Please try again or contact support.'
              : (resultFetch.message ??
                'This result could not be loaded. Please try again or contact support.')}
          </p>
        </WorkspaceSurface>
      ) : result.resultState === 'processing' ? (
        <WorkspaceSurface className="p-6">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Processing
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your interview is being reviewed. This usually takes a few minutes.
            Check back shortly.
          </p>
        </WorkspaceSurface>
      ) : result.resultState === 'under_review' ? (
        <WorkspaceSurface className="p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Under review
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your report is being reviewed by the recruiting team. You will be
            notified when a decision is ready.
          </p>
        </WorkspaceSurface>
      ) : result.resultState === 'released' && result.report ? (
        <WorkspaceSurface className="p-6">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Outcome
          </p>
          <p className="mt-2 text-lg font-semibold">
            {formatRecommendationLabel(result.report.recommendation)}
          </p>
          {typeof result.report.weightedScore === 'number' ? (
            <p
              className={cn(
                'mt-3 inline-flex rounded-full px-3 py-1 text-sm font-medium tabular-nums',
                scoreColor(result.report.weightedScore)
              )}
            >
              Weighted score {formatScoreValue(result.report.weightedScore)} / 5
            </p>
          ) : null}
          {result.report.summary ? (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {result.report.summary}
            </p>
          ) : null}
          {result.report.generatedAt ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Report generated {formatDateTime(result.report.generatedAt)}
            </p>
          ) : null}
        </WorkspaceSurface>
      ) : (
        <WorkspaceSurface className="p-6">
          <p className="text-sm text-muted-foreground">
            No result is available for this interview yet.
          </p>
        </WorkspaceSurface>
      )}
    </section>
  )
}
