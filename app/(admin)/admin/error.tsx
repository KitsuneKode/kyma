'use client'

export default function AdminError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6">
      <h2 className="text-lg font-semibold">Admin page error</h2>
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
