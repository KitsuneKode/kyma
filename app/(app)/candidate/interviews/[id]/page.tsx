import { fetchQuery } from 'convex/nextjs'
import type { Id } from '@/convex/_generated/dataModel'

import { api } from '@/convex/_generated/api'
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
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Interview result</h1>
      {!result ? (
        <p className="text-sm text-muted-foreground">
          No released result found.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">State: {result.state}</p>
          {result.report ? (
            <div className="rounded-xl border p-4">
              <p className="font-medium">
                Recommendation: {result.report.recommendation}
              </p>
              <p className="text-sm text-muted-foreground">
                {result.report.summary}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Result is not released yet.
            </p>
          )}
        </>
      )}
    </section>
  )
}
