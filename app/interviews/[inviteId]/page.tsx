import { connection } from 'next/server'

import { api } from '@/convex/_generated/api'
import { RenderErrorBoundary } from '@/components/errors/render-error-boundary'
import { InviteAccessScreen } from '@/components/interview/invite-access-screen'
import { InterviewWorkspace } from '@/components/interview/interview-workspace'
import { hasClerkServerCredentials } from '@/lib/clerk/config'
import { serverConvexQuery } from '@/lib/convex/server-query'
import { UNAVAILABLE_INVITE_FALLBACK_MESSAGE } from '@/lib/interview/invite-access-copy'
import { createInitialInterviewSnapshot } from '@/lib/interview/snapshot'

type InterviewPageProps = {
  params: Promise<{
    inviteId: string
  }>
}

const interviewShellClassName =
  'flex min-h-[100dvh] w-full flex-col bg-[#0a0a0a] text-foreground'

export default async function InterviewPage({ params }: InterviewPageProps) {
  await connection()
  const { inviteId } = await params
  const nowMs = Date.now()
  const publicSnapshotResult = await serverConvexQuery(
    api.interviews.public.getPublicSessionDetail,
    {
      inviteToken: inviteId,
      nowMs,
    },
    { public: true }
  )
  const publicSnapshot = publicSnapshotResult.ok
    ? publicSnapshotResult.data
    : null

  if (!publicSnapshot || publicSnapshot.accessState !== 'available') {
    return (
      <main className={interviewShellClassName}>
        <div className="mx-auto flex w-full max-w-3xl flex-1 items-center px-6 py-10">
          <InviteAccessScreen
            accessMessage={
              publicSnapshot?.accessMessage ??
              UNAVAILABLE_INVITE_FALLBACK_MESSAGE
            }
            accessState={publicSnapshot?.accessState ?? 'unavailable'}
            inviteId={inviteId}
          />
        </div>
      </main>
    )
  }

  const snapshot = createInitialInterviewSnapshot(inviteId, publicSnapshot)

  return (
    // Intentional dark-locked interview shell (immersive route exception).
    <main className={interviewShellClassName}>
      <RenderErrorBoundary title="Interview workspace">
        <InterviewWorkspace
          initialSnapshot={snapshot}
          skipInviteAuth={!hasClerkServerCredentials()}
        />
      </RenderErrorBoundary>
    </main>
  )
}
