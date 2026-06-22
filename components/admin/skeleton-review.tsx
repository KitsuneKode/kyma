function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-muted/30 ${className ?? ''}`}
    />
  )
}

export function SkeletonReview() {
  return (
    <div className="flex w-full flex-col gap-8">
      <div className="sticky top-0 z-20 rounded-3xl bg-card/95 px-5 py-4 ring-1 ring-border/40">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Pulse className="size-7 rounded-lg" />
              <div className="flex flex-col gap-2">
                <Pulse className="h-3 w-32" />
                <Pulse className="h-6 w-40" />
                <Pulse className="h-4 w-56" />
              </div>
            </div>
            <Pulse className="h-8 w-32 rounded-lg" />
          </div>
          <div className="flex flex-wrap justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Pulse key={index} className="h-6 w-20 rounded-full" />
              ))}
            </div>
            <div className="hidden gap-2 md:flex">
              {Array.from({ length: 3 }).map((_, index) => (
                <Pulse key={index} className="h-10 w-24 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,420px)]">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Pulse className="h-7 w-28 rounded-md" />
            <Pulse className="h-7 w-24 rounded-md" />
          </div>
          <Pulse className="min-h-[420px] rounded-3xl" />
          <Pulse className="h-24 rounded-3xl" />
        </div>

        <div className="flex flex-col gap-4">
          <Pulse className="h-[520px] rounded-3xl" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Pulse key={index} className="h-48 rounded-3xl" />
        ))}
      </section>

      <div className="rounded-3xl ring-1 ring-border/40">
        <div className="flex gap-2 border-b border-border/50 px-4 pt-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Pulse key={index} className="h-8 w-20 rounded-t-xl" />
          ))}
        </div>
        <div className="p-5">
          <Pulse className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
