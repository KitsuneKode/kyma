import type { Id } from '@/convex/_generated/dataModel'

import { api } from '@/convex/_generated/api'
import { InterviewResultContent } from '@/components/candidate/interview-result-content'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { serverConvexPortalQuery } from '@/lib/convex/server-query'

type InterviewResultPageProps = {
  params: Promise<{ id: string }>
}

export default async function CandidateInterviewResultPage({
  params,
}: InterviewResultPageProps) {
  const { id } = await params
  const resultFetch = await serverConvexPortalQuery(
    api.interviews.candidatePortal.getCandidateInterviewResult,
    { sessionId: id as Id<'interviewSessions'> },
    null
  )

  if (resultFetch.status === 'error') {
    return (
      <section className="space-y-6">
        <WorkspacePageHeader
          eyebrow="Interview outcome"
          title="Interview result"
          description="Review your released outcome or current processing status."
        />
        <Alert variant="destructive">
          <AlertTitle>Unable to load interview result</AlertTitle>
          <AlertDescription>{resultFetch.message}</AlertDescription>
        </Alert>
        <Button
          nativeButton={false}
          variant="outline"
          render={<Link href="/candidate/interviews" />}
        >
          Back to interviews
        </Button>
      </section>
    )
  }

  if (resultFetch.status === 'empty' || !resultFetch.data) {
    return (
      <section className="space-y-6">
        <WorkspacePageHeader
          eyebrow="Interview outcome"
          title="Interview result"
          description="Review your released outcome or current processing status."
        />
        <WorkspaceSurface className="p-5">
          <p className="text-sm text-muted-foreground">
            {resultFetch.status === 'empty'
              ? 'Sign in to view this interview result, or confirm the session link with your recruiter.'
              : 'This result could not be loaded. Please try again or contact support.'}
          </p>
        </WorkspaceSurface>
      </section>
    )
  }

  return <InterviewResultContent result={resultFetch.data} />
}
