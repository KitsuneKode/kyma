import { PageSkeleton } from '@/components/admin/page-skeleton'

export default function AdminLoading() {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-7xl flex-col px-6 py-10">
      <PageSkeleton />
    </main>
  )
}
