'use client'

import { InlineError } from '@/components/errors/inline-error'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <InlineError
      title="This page hit an error"
      description="Something went wrong loading this part of the recruiter hub. Retrying often resolves transient issues."
      error={error}
      reset={reset}
    />
  )
}
