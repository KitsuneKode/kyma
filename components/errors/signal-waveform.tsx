import { cn } from '@/lib/utils'

type SignalWaveformProps = {
  tone?: 'brand' | 'alert'
  className?: string
}

/**
 * Animated equalizer that echoes the Kyma waveform mark. Pure CSS (no JS), so
 * it runs in cached server components and client error boundaries alike, and
 * collapses to a static state under `prefers-reduced-motion` via the global
 * motion override. The center bar "flatlines" to read as a lost/broken signal.
 */
const BARS = [
  { height: 38, delay: 0, duration: 1.4 },
  { height: 66, delay: 0.12, duration: 1.15 },
  { height: 92, delay: 0.24, duration: 1.3 },
  { height: 18, delay: 0.36, duration: 1.5 },
  { height: 100, delay: 0.18, duration: 1.2 },
  { height: 30, delay: 0.42, duration: 1.45 },
  { height: 78, delay: 0.06, duration: 1.25 },
  { height: 54, delay: 0.3, duration: 1.35 },
  { height: 44, delay: 0.2, duration: 1.5 },
] as const

export function SignalWaveform({
  tone = 'brand',
  className,
}: SignalWaveformProps) {
  return (
    <div
      aria-hidden
      className={cn('flex h-16 items-center justify-center gap-1.5', className)}
    >
      {BARS.map((bar, index) => (
        <span
          key={index}
          className={cn(
            'w-2 origin-center rounded-full motion-safe:animate-[waveform-bounce_var(--bar-duration)_ease-in-out_infinite]',
            tone === 'brand'
              ? 'bg-gradient-to-t from-emerald-600 via-emerald-500 to-emerald-300'
              : 'bg-gradient-to-t from-destructive/70 via-destructive to-destructive'
          )}
          style={{
            height: `${bar.height}%`,
            animationDelay: `${bar.delay}s`,
            ['--bar-duration' as string]: `${bar.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
