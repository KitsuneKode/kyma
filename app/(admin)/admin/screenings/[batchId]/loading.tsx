import { Skeleton } from '@/components/ui/skeleton'

export default function ScreeningBatchLoading() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-4 w-[28rem]" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  )
}
