import { fetchQuery } from 'convex/nextjs'
import type { Id } from '@/convex/_generated/dataModel'
import { api } from '@/convex/_generated/api'
import { RecruiterChat } from '@/components/recruiter/recruiter-chat'
import { CandidateReviewWorkspace } from '@/components/recruiter/candidate-review-workspace'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { RecruiterReviewAccessPanel } from '@/components/recruiter/recruiter-review-access-panel'
import { clientEnv } from '@/lib/env/client'
import { RenderErrorBoundary } from '@/components/errors/render-error-boundary'
import { runConvexFetch } from '@/lib/convex/server-fetch'

type CandidateReviewPageProps = {
  params: Promise<{
    sessionId: string
  }>
}

export default async function CandidateReviewPage({
  params,
}: CandidateReviewPageProps) {
  const [{ sessionId }, token] = await Promise.all([
    params,
    getServerConvexAuthToken(),
  ])
  const detailResult = clientEnv.NEXT_PUBLIC_CONVEX_URL
    ? await runConvexFetch(() =>
        fetchQuery(
          api.recruiter.getCandidateReviewDetail,
          {
            sessionId: sessionId as Id<'interviewSessions'>,
          },
          {
            token: token ?? undefined,
          }
        )
      )
    : { ok: false as const, kind: 'not_found' as const }

  const detail = detailResult.ok ? detailResult.data : null

  if (!detailResult.ok || !detail) {
    const failureKind = detailResult.ok ? 'not_found' : detailResult.kind
    const failureMessage = detailResult.ok ? undefined : detailResult.message

    return (
      <RecruiterReviewAccessPanel
        failureKind={failureKind}
        failureMessage={failureMessage}
      />
    )
  }

  return (
    <>
      <CandidateReviewWorkspace detail={detail} />

      <RenderErrorBoundary title="Recruiter chat">
        <RecruiterChat
          sessionId={detail.session.id}
          reportId={detail.report?.id}
          initialMessages={detail.chatMessages}
        />
      </RenderErrorBoundary>
    </>
  )
}
