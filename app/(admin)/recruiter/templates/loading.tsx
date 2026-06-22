import { Skeleton } from '@/components/ui/skeleton'

export default function AdminTemplatesLoading() {
  return (
    <section className="space-y-4">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </section>
  )
}
