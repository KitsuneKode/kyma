import type { Id } from '@/convex/_generated/dataModel'

import { PracticeFeedbackPanel } from '@/components/candidate/practice-feedback-panel'

type PracticeFeedbackPageProps = {
  params: Promise<{ sessionId: string }>
}

export default async function PracticeFeedbackPage({
  params,
}: PracticeFeedbackPageProps) {
  const { sessionId } = await params

  return (
    <PracticeFeedbackPanel sessionId={sessionId as Id<'interviewSessions'>} />
  )
}
