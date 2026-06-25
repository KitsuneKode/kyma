import { RecruiterAccessState } from '@/components/recruiter/recruiter-access-state'

type RecruiterReviewAccessPanelProps = {
  failureKind: 'auth' | 'forbidden' | 'not_found' | 'unknown'
  failureMessage?: string
}

export function RecruiterReviewAccessPanel({
  failureKind,
  failureMessage,
}: RecruiterReviewAccessPanelProps) {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <RecruiterAccessState
        kind={failureKind}
        context="review"
        message={failureMessage}
        eyebrow="Recruiter review"
      />
    </main>
  )
}
