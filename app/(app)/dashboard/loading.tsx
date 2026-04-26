import { Skeleton } from '@/components/ui/skeleton'

export default function CandidateDashboardLoading() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-28 rounded-2xl" />
    </section>
  )
}
