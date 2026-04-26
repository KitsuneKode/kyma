import { fetchQuery } from 'convex/nextjs'

import { api } from '@/convex/_generated/api'
import { RenderErrorBoundary } from '@/components/errors/render-error-boundary'
import { InterviewWorkspace } from '@/components/interview/interview-workspace'
import { clientEnv } from '@/lib/env/client'
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
  const publicSnapshot = clientEnv.NEXT_PUBLIC_CONVEX_URL
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
    <main className="flex min-h-[100dvh] w-full flex-col bg-[#0a0a0a] text-foreground">
      <RenderErrorBoundary title="Interview workspace">
        <InterviewWorkspace initialSnapshot={snapshot} />
      </RenderErrorBoundary>
    </main>
  )
}
