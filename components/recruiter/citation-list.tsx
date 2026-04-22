type Citation = {
  ref: string
  label: string
  kind: string
}

export function CitationList({ citationsJson }: { citationsJson: string }) {
  let citations: Citation[] = []

  try {
    const parsed = JSON.parse(citationsJson) as unknown
    if (Array.isArray(parsed)) {
      citations = parsed.filter((item): item is Citation => {
        if (!item || typeof item !== 'object') {
          return false
        }
        const value = item as Record<string, unknown>
        return (
          typeof value.ref === 'string' &&
          typeof value.label === 'string' &&
          typeof value.kind === 'string'
        )
      })
    }
  } catch {
    citations = []
  }

  if (!citations.length) {
    return null
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {citations.map((citation) => (
        <div
          key={`${citation.kind}-${citation.ref}-${citation.label}`}
          className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs"
        >
          <span className="rounded-md bg-background px-2 py-1 font-medium">
            {citation.kind}
          </span>
          <span className="min-w-0 flex-1 text-muted-foreground">
            {citation.label}
          </span>
          <span className="font-medium tabular-nums">{citation.ref}</span>
        </div>
      ))}
    </div>
  )
}
