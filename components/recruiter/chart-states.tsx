import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type ChartStateProps = {
  height?: number
  className?: string
}

export function ChartLoadingState({
  height = 260,
  className,
}: ChartStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col justify-center gap-3 rounded-xl bg-muted/20 p-6 ring-1 ring-border/30',
        className
      )}
      style={{ height }}
      aria-busy="true"
      aria-label="Loading chart"
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-[calc(100%-2rem)] w-full rounded-lg" />
    </div>
  )
}

export function ChartEmptyState({
  height = 260,
  message = 'No dimension scores available yet.',
  className,
}: ChartStateProps & { message?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl bg-muted/15 px-6 text-center ring-1 ring-border/30',
        className
      )}
      style={{ height }}
      role="status"
    >
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export function ChartErrorState({
  height = 260,
  message = 'Unable to render this chart.',
  className,
}: ChartStateProps & { message?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl bg-destructive/5 px-6 text-center ring-1 ring-destructive/20',
        className
      )}
      style={{ height }}
      role="alert"
    >
      <p className="text-sm text-destructive">{message}</p>
    </div>
  )
}
