import Link from 'next/link'
import type { ReactNode } from 'react'

import { Logo } from '@/components/marketing/logo'
import { cn } from '@/lib/utils'
import { SignalWaveform } from './signal-waveform'

type ErrorScreenProps = {
  code: string
  title: string
  description: string
  actions: ReactNode
  tone?: 'brand' | 'alert'
  footnote?: ReactNode
}

/**
 * Shared full-bleed layout for the candidate-facing error surfaces (404, route
 * error, global error). Presentational only — no client hooks — so it can be
 * rendered from a cached server component (`not-found`) and from client error
 * boundaries alike. Callers supply their own action buttons.
 */
export function ErrorScreen({
  code,
  title,
  description,
  actions,
  tone = 'brand',
  footnote,
}: ErrorScreenProps) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background">
      <div
        className={cn(
          'pointer-events-none absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full blur-3xl motion-safe:animate-[glow-breathe_6s_ease-in-out_infinite]',
          tone === 'brand' ? 'bg-emerald-500/12' : 'bg-destructive/12'
        )}
      />

      <header className="relative z-10 flex h-20 items-center px-6 md:px-12">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo className="h-6 w-auto" />
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <div className="motion-safe:animate-[signal-float_5s_ease-in-out_infinite]">
          <div className="flex h-28 w-44 animate-in items-center justify-center rounded-3xl bg-card/60 shadow-lg ring-1 ring-border/60 backdrop-blur-sm duration-500 fade-in-0 zoom-in-95">
            <SignalWaveform tone={tone} className="h-14 w-32" />
          </div>
        </div>

        <p
          className={cn(
            'mt-10 animate-in font-mono text-sm font-medium tracking-[0.35em] uppercase duration-500 fade-in-0 slide-in-from-bottom-2',
            tone === 'brand'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-destructive'
          )}
        >
          {code}
        </p>

        <h1 className="mt-4 max-w-xl animate-in text-5xl font-semibold tracking-tight text-balance duration-500 fade-in-0 slide-in-from-bottom-2 md:text-6xl lg:text-7xl">
          {title}
        </h1>

        <p className="mt-6 max-w-md animate-in text-lg leading-relaxed text-pretty text-muted-foreground duration-500 fade-in-0 slide-in-from-bottom-2">
          {description}
        </p>

        <div className="mt-10 flex animate-in flex-wrap items-center justify-center gap-4 duration-700 fade-in-0 slide-in-from-bottom-2">
          {actions}
        </div>

        {footnote ? (
          <div className="mt-10 max-w-md animate-in text-sm text-muted-foreground/80 duration-700 fade-in-0">
            {footnote}
          </div>
        ) : null}
      </main>
    </div>
  )
}
