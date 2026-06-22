import { fetchQuery } from 'convex/nextjs'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { AdminStatePanel } from '@/components/admin/admin-state-panel'
import { CandidateReviewWorkspace } from '@/components/recruiter/candidate-review-workspace'
import { clientEnv } from '@/lib/env/client'
import { serverEnv } from '@/lib/env/server'
import { createRecordingPlaybackUrl } from '@/lib/livekit/recording-playback'
import { getPrimaryRecording } from '@/lib/recruiter/recording-playback'

type DevReviewPageProps = {
  params: Promise<{ sessionId: string }>
}

export const metadata = {
  title: 'Dev review preview',
  description:
    'Local-only recruiter review preview for seeded interview sessions.',
}

export default async function DevReviewPage({ params }: DevReviewPageProps) {
  await connection()

  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const { sessionId } = await params
  const detail = clientEnv.NEXT_PUBLIC_CONVEX_URL
    ? await fetchQuery(api.recruiter.getCandidateReviewDetail, {
        sessionId: sessionId as Id<'interviewSessions'>,
        processingKey: serverEnv.KYMA_PROCESSING_WRITE_KEY ?? '__dev_preview__',
      }).catch(() => null)
    : null

  if (!detail) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <AdminStatePanel
          eyebrow="Development preview"
          title="Seeded review not found"
          description="Run bun run db:seed:dev and open one of the returned sampleReviewSessionIds."
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
        description="Read-only local view for validating loaded review data without a Clerk session. Production uses the protected recruiter route."
      />

      <CandidateReviewWorkspace
        detail={detail}
        readOnly
        audioPlaybackUrl={audioPlaybackUrl}
      />
    </main>
  )
}
