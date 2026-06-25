import { Suspense } from 'react'

import { RecruiterDashboardLoader } from '@/components/recruiter/recruiter-dashboard-loader'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminPage() {
  return (
    <div className="flex w-full flex-col gap-8">
      <Suspense fallback={<RecruiterDashboardSkeleton />}>
        <RecruiterDashboardLoader />
      </Suspense>
    </div>
  )
}

function RecruiterDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 py-6" aria-busy="true">
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-36 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-3xl lg:col-span-1" />
        <Skeleton className="h-72 rounded-3xl lg:col-span-2" />
      </div>
    </div>
  )
}
