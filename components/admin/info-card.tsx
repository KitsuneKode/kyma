import type { ReactNode } from 'react'

export function InfoCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl bg-card p-6 shadow-sm">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  )
}
