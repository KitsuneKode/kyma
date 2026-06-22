'use client'

import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type InlineErrorProps = {
  title: string
  error: Error & { digest?: string }
  reset: () => void
  description?: string
  className?: string
}

/**
 * Compact, theme-aware error card for nested route boundaries that render
 * inside an existing layout (dashboard chrome, interview shell) rather than
 * taking over the whole viewport.
 */
export function InlineError({
  title,
  error,
  reset,
  description,
  className,
}: InlineErrorProps) {
  return (
    <div
      className={cn(
        'animate-in rounded-2xl border border-destructive/30 bg-card/60 p-8 shadow-sm ring-1 ring-border/40 duration-300 fade-in-0 zoom-in-95',
        className
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <IconAlertTriangle className="size-5" />
      </div>

      <h2 className="mt-5 text-xl font-semibold tracking-tight">{title}</h2>

      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
        {description ??
          error.message ??
          'An unexpected error occurred while loading this view.'}
      </p>

      <div className="mt-6 flex items-center gap-3">
        <Button size="lg" className="h-9 rounded-full px-5" onClick={reset}>
          <IconRefresh />
          Try again
        </Button>
        {error.digest ? (
          <span className="font-mono text-xs text-muted-foreground/70">
            Ref: {error.digest}
          </span>
        ) : null}
      </div>
    </div>
  )
}
