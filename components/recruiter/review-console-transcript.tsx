'use client'

import { IconMessageCircle } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDimensionLabel } from '@/lib/recruiter/format'
import { formatTime } from '@/lib/format/time'
import { cn } from '@/lib/utils'
import { WorkspaceSurface } from '@/components/workspace/surface'
import {
  useReviewActions,
  useReviewData,
  useReviewFocus,
} from '@/components/recruiter/review-context'

export function ReviewConsoleTranscript() {
  const { candidateName } = useReviewData()
  const { jumpToTime } = useReviewActions()
  const {
    activeDimension,
    transcriptMode,
    setTranscriptMode,
    citedSegmentIds,
    visibleTranscript,
    activeSegmentId,
    transcriptRef,
  } = useReviewFocus()

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={transcriptMode === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTranscriptMode('all')}
          className="active:scale-[0.96]"
        >
          Full transcript
        </Button>
        <Button
          type="button"
          variant={transcriptMode === 'cited' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTranscriptMode('cited')}
          disabled={!activeDimension}
          className="active:scale-[0.96]"
        >
          Cited only
        </Button>
        {activeDimension ? (
          <p className="text-xs text-muted-foreground">
            Showing{' '}
            <span className="font-medium text-foreground">
              {formatDimensionLabel(activeDimension)}
            </span>
          </p>
        ) : null}
      </div>

      <WorkspaceSurface className="p-0">
        <ScrollArea
          className="max-h-[min(70dvh,720px)] min-h-[420px] w-full pr-3"
          ref={transcriptRef}
        >
          <div className="flex flex-col gap-1.5">
            {visibleTranscript.length ? (
              visibleTranscript.map((segment) => {
                const isActive = segment.id === activeSegmentId
                const isCandidate = segment.speaker === 'candidate'
                const isCited = citedSegmentIds.has(segment.id)

                return (
                  <button
                    key={segment.id}
                    type="button"
                    data-segment-id={segment.id}
                    onClick={() => jumpToTime(segment.startSec)}
                    className={cn(
                      'group flex min-h-10 gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left transition-[border-color,background-color] duration-200 active:scale-[0.98]',
                      isActive
                        ? 'border-l-primary bg-primary/[0.06]'
                        : isCited
                          ? 'border-l-amber-500/60 bg-amber-500/[0.04]'
                          : 'border-l-transparent hover:bg-muted/15'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            isCandidate
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted/30 text-muted-foreground'
                          )}
                        >
                          {isCandidate
                            ? candidateName
                            : segment.speaker === 'agent'
                              ? 'AI'
                              : 'Sys'}
                        </span>
                        {isCited ? (
                          <span className="size-1.5 rounded-full bg-amber-500" />
                        ) : null}
                      </div>
                      <p
                        className={cn(
                          'mt-1.5 text-[13px] leading-6 text-pretty',
                          isActive || isCited
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        )}
                      >
                        {segment.text}
                      </p>
                    </div>
                    <span className="shrink-0 pt-0.5 font-mono text-[10px] text-muted-foreground/60 tabular-nums">
                      {formatTime(segment.startSec)}
                    </span>
                  </button>
                )
              })
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2">
                <IconMessageCircle className="size-5 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No segments match the current focus.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </WorkspaceSurface>
    </>
  )
}
