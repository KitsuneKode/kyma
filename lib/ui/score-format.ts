export type ScoreColorVariant = 'chip' | 'bar'

export function scoreColor(
  score: number | undefined,
  variant: ScoreColorVariant = 'chip'
): string {
  if (variant === 'bar') {
    if (score === undefined || !Number.isFinite(score)) {
      return 'hsl(var(--muted))'
    }
    if (score <= 2) return 'hsl(var(--destructive))'
    if (score <= 3) return 'hsl(38 92% 50%)'
    return 'hsl(142 71% 45%)'
  }

  if (score === undefined) return 'bg-muted/30 text-muted-foreground'
  if (score <= 2.0) return 'bg-red-500/15 text-red-300'
  if (score <= 3.0) return 'bg-amber-500/15 text-amber-300'
  if (score <= 4.0) return 'bg-emerald-500/10 text-emerald-300'
  return 'bg-emerald-500/20 text-emerald-300 font-bold'
}
