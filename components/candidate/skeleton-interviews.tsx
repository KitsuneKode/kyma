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
        {(
          [
            ['all', 'All'],
            ['active', 'Active'],
            ['pending_release', 'Pending release'],
            ['released', 'Released'],
          ] as const
        ).map(([value]) => (
          <Pulse key={`filter-${value}`} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {(['card-a', 'card-b', 'card-c'] as const).map((id) => (
          <Pulse key={id} className="h-36 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
