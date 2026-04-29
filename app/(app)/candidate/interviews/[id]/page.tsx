import { fetchQuery } from 'convex/nextjs'
import type { Id } from '@/convex/_generated/dataModel'
import Link from 'next/link'

import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'
import {
  formatDateTime,
  formatRecommendationLabel,
} from '@/lib/recruiter/format'

type InterviewResultPageProps = {
  params: Promise<{ id: string }>
}

export default async function CandidateInterviewResultPage({
  params,
}: InterviewResultPageProps) {
  const { id } = await params
  const token = await getServerConvexAuthToken()
  const result =
    clientEnv.NEXT_PUBLIC_CONVEX_URL && token
      ? await fetchQuery(
          api.interviews.getCandidateInterviewResult,
          { sessionId: id as Id<'interviewSessions'> },
          { token: token ?? undefined }
        ).catch(() => null)
      : null

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Interview result</h1>
        <Button
          nativeButton={false}
          variant="outline"
          size="sm"
          render={<Link href="/candidate/interviews" />}
        >
          Back to interviews
        </Button>
      </header>

      {!result ? (
        <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
          This result could not be loaded. Please try again or contact support.
        </p>
      ) : result.resultState === 'processing' ? (
        <div className="rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
          <p className="text-sm font-medium text-amber-400">Processing</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your interview is being reviewed. This usually takes a few minutes.
            Check back shortly.
          </p>
        </div>
      ) : result.resultState === 'under_review' ? (
        <div className="rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
          <p className="text-sm font-medium text-muted-foreground">
            Under review
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Your report is being reviewed by the recruiting team. You will be
            notified when a decision is ready.
          </p>
        </div>
      ) : result.resultState === 'released' && result.report ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Outcome
            </p>
            <p className="mt-2 text-lg font-semibold">
              {formatRecommendationLabel(result.report.recommendation)}
            </p>
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
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
          <p className="text-sm text-muted-foreground">
            No result is available for this interview yet.
          </p>
        </div>
      )}
    </section>
  )
}
