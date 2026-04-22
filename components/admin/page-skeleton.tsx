import { Skeleton } from '@/components/ui/skeleton'
import { AdminSurface } from '@/components/admin/admin-surface'

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <AdminSurface>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-9 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
      </AdminSurface>
      <section className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <AdminSurface key={index} className="rounded-[24px] p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-20" />
            <Skeleton className="mt-3 h-4 w-full" />
          </AdminSurface>
        ))}
      </section>
      <AdminSurface>
        <Skeleton className="h-4 w-32" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      </AdminSurface>
    </div>
  )
}
