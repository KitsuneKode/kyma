import { fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import { InterviewWorkspace } from '@/components/interview/interview-workspace'
import { publicEnv } from '@/lib/env/public'
import { serverEnv } from '@/lib/env/server'
import { createInitialInterviewSnapshot } from '@/lib/interview/snapshot'
import { isDevelopmentMode } from '@/lib/runtime-mode'

type InterviewPageProps = {
  params: Promise<{
    inviteId: string
  }>
}

const DEMO_INVITE_ENABLED =
  isDevelopmentMode(serverEnv.NODE_ENV) ||
  serverEnv.KYMA_ENABLE_DEMO_INVITE === '1'

function isEnabledDemoInviteToken(inviteId: string) {
  return inviteId === 'demo-invite' && DEMO_INVITE_ENABLED
}

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { inviteId } = await params
  const publicSnapshot = publicEnv.NEXT_PUBLIC_CONVEX_URL
    ? await fetchQuery(api.interviews.getPublicSessionDetail, {
        inviteToken: inviteId,
      }).catch(() => null)
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
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-6xl flex-col px-6 py-10">
      <InterviewWorkspace initialSnapshot={snapshot} />
    </main>
  )
}
