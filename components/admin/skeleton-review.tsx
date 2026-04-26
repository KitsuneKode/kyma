function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-muted/30 ${className ?? ''}`}
    />
  )
}

export function SkeletonReview() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="sticky top-0 z-20 rounded-2xl bg-card/95 px-5 py-4 ring-1 ring-border/40">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Pulse className="size-7 rounded-lg" />
            <div className="flex flex-col gap-2">
              <Pulse className="h-5 w-36" />
              <div className="flex gap-2">
                <Pulse className="h-5 w-20 rounded-full" />
                <Pulse className="h-5 w-24" />
              </div>
            </div>
          </div>
          <div className="hidden gap-3 lg:flex">
            <Pulse className="h-10 w-24 rounded-lg" />
            <Pulse className="h-10 w-24 rounded-lg" />
            <Pulse className="h-10 w-24 rounded-lg" />
          </div>
          <Pulse className="h-8 w-32 rounded-lg" />
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Pulse className="h-7 w-28 rounded-md" />
            <Pulse className="h-7 w-24 rounded-md" />
          </div>
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3 rounded-lg px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <Pulse className="h-4 w-12 rounded-full" />
                  <Pulse className="mt-2 h-4 w-full" />
                  <Pulse className="mt-1 h-4 w-3/4" />
                </div>
                <Pulse className="h-3 w-10" />
              </div>
            ))}
          </div>
          <Pulse className="h-24 rounded-[28px]" />
        </div>

        <div className="flex flex-col gap-4">
          <Pulse className="h-16 rounded-2xl" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Pulse key={i} className="h-14 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
