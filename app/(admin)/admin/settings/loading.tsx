import { Skeleton } from '@/components/ui/skeleton'

export default function AdminSettingsLoading() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-72" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}
