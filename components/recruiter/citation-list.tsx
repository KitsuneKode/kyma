'use client'

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'

type Citation = {
  ref: string
  label: string
  kind: string
}

function parseCitations(citationsJson: string): Citation[] {
  try {
    const parsed = JSON.parse(citationsJson) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((item): item is Citation => {
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
  } catch {
    return []
  }
}

function parseCitationTimeSec(ref: string): number | null {
  const numeric = Number.parseFloat(ref)
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null
  }
  return numeric
}

export function CitationList({
  citationsJson,
  onJumpToTime,
}: {
  citationsJson: string
  onJumpToTime?: (timeSec: number) => void
}) {
  const citations = parseCitations(citationsJson)

  if (!citations.length) {
    return null
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {citations.map((citation) => {
        const timeSec = parseCitationTimeSec(citation.ref)
        const isJumpable = timeSec !== null && Boolean(onJumpToTime)
        const formattedTime =
          timeSec !== null ? formatCitationTime(timeSec) : citation.ref

        return (
          <HoverCard key={`${citation.kind}-${citation.ref}-${citation.label}`}>
            <HoverCardTrigger
              render={
                <button
                  type="button"
                  disabled={!isJumpable}
                  onClick={() => {
                    if (timeSec !== null) {
                      onJumpToTime?.(timeSec)
                    }
                  }}
                  className="flex w-full flex-wrap items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-left text-xs transition-transform active:scale-[0.98] disabled:cursor-default disabled:active:scale-100"
                >
                  <span className="rounded-md bg-background px-2 py-1 font-medium">
                    {citation.kind}
                  </span>
                  <span className="min-w-0 flex-1 text-muted-foreground">
                    {citation.label}
                  </span>
                  <span className="font-mono font-medium tabular-nums">
                    {formattedTime}
                  </span>
                </button>
              }
            />
            <HoverCardContent side="top" align="start" className="w-72">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-semibold tracking-wide uppercase">
                    {citation.kind}
                  </span>
                  <span className="font-mono text-xs tabular-nums">
                    {formattedTime}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground">
                  {citation.label}
                </p>
                {isJumpable ? (
                  <p className="text-xs text-muted-foreground">
                    Click to jump to this moment in the transcript.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Reference: {citation.ref}
                  </p>
                )}
              </div>
            </HoverCardContent>
          </HoverCard>
        )
      })}
    </div>
  )
}

function formatCitationTime(timeSec: number) {
  const minutes = Math.floor(timeSec / 60)
  const seconds = Math.floor(timeSec % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
