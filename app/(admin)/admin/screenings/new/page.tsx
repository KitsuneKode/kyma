import Link from 'next/link'

import { PageHeader } from '@/components/admin/page-header'
import { ScreeningCreationForm } from '@/components/admin/screening-creation-form'
import { Button } from '@/components/ui/button'
import { AdminSurface } from '@/components/admin/admin-surface'

export default function NewScreeningPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <PageHeader
        eyebrow="Screening ops"
        title="Create screening batch"
        description="Create invite-controlled candidate cohorts with explicit access limits, expiration, and policy overrides."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/admin/screenings" />}
          >
            Back to screenings
          </Button>
        }
      />

      <AdminSurface>
        <ScreeningCreationForm />
      </AdminSurface>
    </main>
  )
}
