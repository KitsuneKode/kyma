export function SummaryList({
  label,
  items,
  emptyLabel,
}: {
  label: string
  items: string[]
  emptyLabel: string
}) {
  return (
    <div className="rounded-2xl bg-muted/35 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-border/50">
      <h3 className="text-sm font-semibold">{label}</h3>
      {items.length ? (
        <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  )
}
