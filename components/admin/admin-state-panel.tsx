import type { ReactNode } from 'react'

import { AdminSurface } from '@/components/admin/admin-surface'

export function AdminStatePanel({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <AdminSurface className={className}>
      {eyebrow ? (
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-pretty text-muted-foreground">
        {description}
      </p>
      {action ? (
        <div className="mt-6 flex flex-wrap gap-3">{action}</div>
      ) : null}
    </AdminSurface>
  )
}
