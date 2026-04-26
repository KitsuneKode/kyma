function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-muted/30 ${className ?? ''}`}
    />
  )
}

export function SkeletonCandidates() {
  return (
    <div className="flex w-full flex-col gap-8">
      <div className="rounded-2xl bg-card/80 p-7 ring-1 ring-border/40">
        <Pulse className="h-3 w-24" />
        <Pulse className="mt-3 h-7 w-56" />
        <Pulse className="mt-3 h-4 w-80" />
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Pulse key={i} className="h-28 rounded-2xl" />
        ))}
      </section>

      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border/40">
        <div className="border-b border-border/40 bg-muted/10 px-6 py-5">
          <Pulse className="h-9 w-64 rounded-lg" />
        </div>
        <div className="divide-y divide-border/20">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-6 py-4">
              <div className="flex-1">
                <Pulse className="h-4 w-32" />
                <Pulse className="mt-1 h-3 w-20" />
              </div>
              <Pulse className="h-4 w-24" />
              <Pulse className="h-5 w-12 rounded-full" />
              <Pulse className="h-3 w-20" />
              <Pulse className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
