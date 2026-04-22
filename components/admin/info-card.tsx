import type { ReactNode } from 'react'

import { AdminSurface } from '@/components/admin/admin-surface'

export function InfoCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <AdminSurface className="p-6">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-pretty text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div className="mt-6">{children}</div>
    </AdminSurface>
  )
}
