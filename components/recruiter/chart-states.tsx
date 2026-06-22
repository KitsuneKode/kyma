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
        'flex items-center justify-center rounded-xl bg-muted/20 ring-1 ring-border/30',
        className
      )}
      style={{ height }}
      aria-busy="true"
      aria-label="Loading chart"
    >
      <p className="text-sm text-muted-foreground">Loading chart…</p>
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
