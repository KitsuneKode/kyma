function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-muted/30 ${className ?? ''}`}
    />
  )
}

export function SkeletonCandidateInterviews() {
  return (
    <div className="space-y-8">
      <div>
        <Pulse className="h-3 w-28" />
        <Pulse className="mt-3 h-8 w-64" />
        <Pulse className="mt-3 h-4 w-96 max-w-full" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Pulse key={index} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Pulse key={index} className="h-36 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
