import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { AdminStatePanel } from '@/components/admin/admin-state-panel'
import { CandidateReviewWorkspace } from '@/components/recruiter/candidate-review-workspace'
import { serverEnv } from '@/lib/env/server'
import {
  hasConvexDeployment,
  serverConvexQuery,
} from '@/lib/convex/server-query'
import { createRecordingPlaybackUrl } from '@/lib/livekit/recording-playback'
import { getPrimaryRecording } from '@/lib/recruiter/recording-playback'

type DevReviewPageProps = {
  params: Promise<{ sessionId: string }>
}

export default async function DevReviewPage({ params }: DevReviewPageProps) {
  await connection()

  if (serverEnv.NODE_ENV === 'production') {
    notFound()
  }

  const { sessionId } = await params
  // Requires a signed-in recruiter JWT — processing-key bypass was removed.
  const detailResult = hasConvexDeployment()
    ? await serverConvexQuery(api.recruiter.reviews.getCandidateReviewDetail, {
        sessionId: sessionId as Id<'interviewSessions'>,
      })
    : { ok: false as const, kind: 'not_found' as const }
  const detail = detailResult.ok ? detailResult.data : null

  if (!detail) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <AdminStatePanel
          eyebrow="Development preview"
          title="Seeded review not found"
          description="Sign in with a recruiter org, run bun run db:seed:dev, then open one of the returned sampleReviewSessionIds."
        />
      </main>
    )
  }

  const primaryRecording = getPrimaryRecording(detail)
  const audioPlaybackUrl = primaryRecording
    ? await createRecordingPlaybackUrl(
        primaryRecording.location,
        primaryRecording.filename
      )
    : null

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-6 bg-background px-6 py-8">
      <AdminStatePanel
        eyebrow="Development preview"
        title="Seeded recruiter review"
        description="Local view for validating loaded review data with a Clerk recruiter session. Production uses the protected recruiter route."
      />

      <CandidateReviewWorkspace
        detail={detail}
        readOnly
        audioPlaybackUrl={audioPlaybackUrl}
      />
    </main>
  )
}
