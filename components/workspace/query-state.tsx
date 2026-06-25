import type { ReactNode } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { WorkspaceEmptyState } from '@/components/workspace/empty-state'
import { cn } from '@/lib/utils'

type WorkspaceQueryStateProps = {
  status: 'loading' | 'empty' | 'error' | 'ready'
  children?: ReactNode
  loadingLabel?: string
  emptyTitle: string
  emptyDescription: string
  emptyAction?: ReactNode
  errorTitle?: string
  errorDescription?: string
  errorAction?: ReactNode
  className?: string
}

export function WorkspaceQueryState({
  status,
  children,
  loadingLabel = 'Loading…',
  emptyTitle,
  emptyDescription,
  emptyAction,
  errorTitle = 'Unable to load data',
  errorDescription = 'Something went wrong while loading this view.',
  errorAction,
  className,
}: WorkspaceQueryStateProps) {
  if (status === 'loading') {
    return (
      <div className={cn('flex flex-col gap-3', className)} aria-busy="true">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <p className="sr-only">{loadingLabel}</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className={cn('space-y-4', className)}>
        <Alert variant="destructive">
          <AlertTitle>{errorTitle}</AlertTitle>
          <AlertDescription>{errorDescription}</AlertDescription>
        </Alert>
        {errorAction ? (
          <div className="flex flex-wrap gap-3">{errorAction}</div>
        ) : null}
      </div>
    )
  }

  if (status === 'empty') {
    return (
      <WorkspaceEmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        className={className}
      />
    )
  }

  return <>{children}</>
}
