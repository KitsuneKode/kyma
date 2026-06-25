import type { Id } from '@/convex/_generated/dataModel'
import { api } from '@/convex/_generated/api'
import { RecruiterChat } from '@/components/recruiter/recruiter-chat'
import { CandidateReviewWorkspace } from '@/components/recruiter/candidate-review-workspace'
import { RecruiterReviewAccessPanel } from '@/components/recruiter/recruiter-review-access-panel'
import { RenderErrorBoundary } from '@/components/errors/render-error-boundary'
import {
  hasConvexDeployment,
  serverConvexQuery,
} from '@/lib/convex/server-query'
import { createRecordingPlaybackUrl } from '@/lib/livekit/recording-playback'
import { getPrimaryRecording } from '@/lib/recruiter/recording-playback'

type CandidateReviewPageProps = {
  params: Promise<{
    sessionId: string
  }>
}

export default async function CandidateReviewPage({
  params,
}: CandidateReviewPageProps) {
  const { sessionId } = await params
  const [detailResult, observationsResult] = hasConvexDeployment()
    ? await Promise.all([
        serverConvexQuery(api.recruiter.reviews.getCandidateReviewDetail, {
          sessionId: sessionId as Id<'interviewSessions'>,
        }),
        serverConvexQuery(api.visualObservations.listForSession, {
          sessionId: sessionId as Id<'interviewSessions'>,
        }),
      ])
    : [
        { ok: false as const, kind: 'not_found' as const },
        { ok: true as const, data: [] },
      ]

  const detail = detailResult.ok ? detailResult.data : null
  const visualObservations = observationsResult.ok
    ? observationsResult.data
    : []
  const primaryRecording = detail ? getPrimaryRecording(detail) : null
  const audioPlaybackUrl = primaryRecording
    ? await createRecordingPlaybackUrl(
        primaryRecording.location,
        primaryRecording.filename
      )
    : null

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
    <CandidateReviewWorkspace
      detail={detail}
      audioPlaybackUrl={audioPlaybackUrl}
      visualObservations={visualObservations}
      chatSlot={
        <RenderErrorBoundary title="Recruiter chat">
          <RecruiterChat
            sessionId={detail.session.id}
            reportId={detail.report?.id}
            initialMessages={detail.chatMessages}
          />
        </RenderErrorBoundary>
      }
    />
  )
}
