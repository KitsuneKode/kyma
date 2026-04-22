import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <section className="rounded-xl bg-card p-6 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm text-pretty text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex gap-3">{actions}</div> : null}
      </div>
    </section>
  )
}
