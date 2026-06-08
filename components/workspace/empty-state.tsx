import type { ReactNode } from 'react'

import { AdminStatePanel } from '@/components/admin/admin-state-panel'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { cn } from '@/lib/utils'

export function WorkspaceEmptyState({
  eyebrow,
  title,
  description,
  action,
  className,
  centered = false,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
  className?: string
  centered?: boolean
}) {
  if (centered) {
    return (
      <WorkspaceSurface
        className={cn(
          'flex flex-col items-center gap-6 p-10 text-center',
          className
        )}
      >
        <div className="space-y-2">
          {eyebrow ? (
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              {eyebrow}
            </p>
          ) : null}
          <p className="text-base font-medium">{title}</p>
          <p className="max-w-md text-sm text-pretty text-muted-foreground">
            {description}
          </p>
        </div>
        {action ? (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {action}
          </div>
        ) : null}
      </WorkspaceSurface>
    )
  }

  return (
    <AdminStatePanel
      eyebrow={eyebrow}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  )
}
