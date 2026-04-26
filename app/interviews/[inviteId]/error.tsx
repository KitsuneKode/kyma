'use client'

export default function InterviewError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-destructive/40 bg-destructive/10 p-6">
      <h2 className="text-lg font-semibold">Interview error</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button
        type="button"
        className="mt-4 rounded-md border px-3 py-1 text-sm"
        onClick={reset}
      >
        Retry
      </button>
    </div>
  )
}
