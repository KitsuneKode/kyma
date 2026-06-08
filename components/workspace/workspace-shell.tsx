import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type WorkspaceShellProps = {
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function WorkspaceShell({
  children,
  className,
  contentClassName,
}: WorkspaceShellProps) {
  return (
    <main className={cn('flex-1 overflow-y-auto bg-muted/10', className)}>
      <div className={cn('mx-auto w-full max-w-7xl p-8', contentClassName)}>
        {children}
      </div>
    </main>
  )
}
