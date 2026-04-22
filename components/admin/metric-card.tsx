export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="rounded-xl bg-card p-5 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-3 text-xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {detail ? (
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          {detail}
        </p>
      ) : null}
    </div>
  )
}
