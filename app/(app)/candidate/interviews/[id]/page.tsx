import { fetchQuery } from 'convex/nextjs'
import type { Id } from '@/convex/_generated/dataModel'
import Link from 'next/link'

import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'

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
        <p className="text-sm text-muted-foreground">
          No released result found.
        </p>
      ) : (
        <>
          <div className="rounded-2xl bg-card p-4 text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
            <p className="text-muted-foreground">
              Interview state:{' '}
              <span className="text-foreground">{result.state}</span>
            </p>
            <p className="mt-1 text-muted-foreground">
              Result availability:{' '}
              <span className="text-foreground">{result.resultState}</span>
            </p>
          </div>
          {result.report ? (
            <div className="space-y-3 rounded-2xl bg-card p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Released assessment
              </p>
              <p className="font-medium">
                Recommendation: {result.report.recommendation}
              </p>
              <p className="text-sm text-muted-foreground">
                {result.report.summary}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-card p-5 text-sm text-muted-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
              {result.resultState === 'processing'
                ? 'Your interview is still processing.'
                : result.resultState === 'under_review'
                  ? 'Your report is under recruiter review.'
                  : 'No released assessment is available for this interview yet.'}
            </div>
          )}
          <section className="space-y-3">
            <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
              Transcript timeline
            </h2>
            {result.transcript.length === 0 ? (
              <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
                Transcript is not available yet.
              </p>
            ) : (
              <div className="space-y-2">
                {result.transcript.map((segment) => (
                  <article
                    key={`${segment.id}`}
                    className="rounded-2xl bg-card p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]"
                  >
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {segment.speaker}
                    </p>
                    <p className="mt-2 text-sm">{segment.text}</p>
                    <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                      {new Date(segment.startedAt).toLocaleString()}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  )
}
