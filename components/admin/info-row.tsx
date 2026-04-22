import type { ReactNode } from 'react'

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-muted/35 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-border/50">
      <dt className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-medium">{value}</dd>
    </div>
  )
}
