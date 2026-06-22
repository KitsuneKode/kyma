import { connection } from 'next/server'

import { api } from '@/convex/_generated/api'
import { RenderErrorBoundary } from '@/components/errors/render-error-boundary'
import { InterviewWorkspace } from '@/components/interview/interview-workspace'
import { hasClerkServerCredentials } from '@/lib/clerk/config'
import { serverEnv } from '@/lib/env/server'
import { serverConvexQuery } from '@/lib/convex/server-query'
import { createInitialInterviewSnapshot } from '@/lib/interview/snapshot'
import { isEnabledDemoInviteToken as isEnabledDemoInviteTokenForEnv } from '@/lib/interview/demo-invite'

type InterviewPageProps = {
  params: Promise<{
    inviteId: string
  }>
}

function isEnabledDemoInviteToken(inviteId: string) {
  return isEnabledDemoInviteTokenForEnv(inviteId, serverEnv)
}

export default async function InterviewPage({ params }: InterviewPageProps) {
  await connection()
  const { inviteId } = await params
  const nowMs = Date.now()
  const publicSnapshotResult = await serverConvexQuery(
    api.interviews.public.getPublicInterviewSnapshot,
    {
      inviteToken: inviteId,
      nowMs,
    },
    { public: true }
  )
  const publicSnapshot = publicSnapshotResult.ok
    ? publicSnapshotResult.data
    : null

  const snapshot = createInitialInterviewSnapshot(
    inviteId,
    publicSnapshot,
    !publicSnapshot && !isEnabledDemoInviteToken(inviteId)
      ? {
          accessState: 'unavailable',
          accessMessage:
            'This interview link is invalid, revoked, or not yet ready. Please confirm the link with the recruiter.',
        }
      : undefined
  )

  return (
    // Intentional dark-locked interview shell (immersive route exception).
    <main className="flex min-h-[100dvh] w-full flex-col bg-[#0a0a0a] text-foreground">
      <RenderErrorBoundary title="Interview workspace">
        <InterviewWorkspace
          initialSnapshot={snapshot}
          skipInviteAuth={!hasClerkServerCredentials()}
        />
      </RenderErrorBoundary>
    </main>
  )
}
