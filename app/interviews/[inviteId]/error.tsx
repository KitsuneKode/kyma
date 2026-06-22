'use client'

import { InlineError } from '@/components/errors/inline-error'

export default function InterviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0a0a] p-6">
      <InlineError
        title="Interview couldn't load"
        description="We hit a problem preparing this interview session. Retry to reconnect, or refresh the page if it persists."
        error={error}
        reset={reset}
        className="dark w-full max-w-lg bg-card text-foreground"
      />
    </div>
  )
}
