'use client'

import { useRef } from 'react'
import {
  IconCircleCheckFilled,
  IconFolder,
  IconLayoutDashboard,
  IconMicrophone,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconQuote,
  IconSettings,
  IconSparkles,
  IconUsers,
} from '@tabler/icons-react'
import { AnimatePresence, motion } from '@/components/motion/client-motion'

import { Logo } from '@/components/marketing/logo'
import { useHeroProductDemo } from '@/components/marketing/use-hero-product-demo'
import {
  HERO_PREVIEW_HEIGHT,
  HERO_PREVIEW_WIDTH,
} from '@/components/marketing/hero-preview-dimensions'
import {
  DEMO_CANDIDATES,
  DEMO_QUEUE,
  DEMO_TOTAL_DURATION_SEC,
  formatDemoTimestamp,
  progressFromTimeSec,
  type DemoCandidateId,
  type DemoDimension,
  type DemoFocus,
} from '@/lib/marketing/hero-product-demo'
import { DIMENSION_LABELS, RUBRIC_DIMENSIONS } from '@/lib/rubric/constants'
import { cn } from '@/lib/utils'
import { formatScoreValue, scoreColor } from '@/lib/ui/score-format'

const NAV_ITEMS = [
  { label: 'Overview', icon: IconLayoutDashboard, active: false },
  { label: 'Candidates', icon: IconUsers, active: true },
  { label: 'Screening Batches', icon: IconFolder, active: false },
  { label: 'Templates', icon: IconFolder, active: false },
  { label: 'Settings', icon: IconSettings, active: false },
]

const STATE_DOT = {
  review: 'bg-primary',
  yes: 'bg-emerald-400',
  flag: 'bg-amber-400',
} as const

function WindowDot({ className }: { className: string }) {
  return <span className={cn('size-3 rounded-full', className)} />
}

function focusRing(active: boolean) {
  return cn(
    'transition-[box-shadow] duration-300',
    active && 'shadow-[inset_0_0_0_1px_rgba(232,255,71,0.35)]'
  )
}

function RubricRow({
  dimension,
  index,
  score,
  active,
  onSelect,
  animateBars,
}: {
  dimension: DemoDimension
  index: number
  score: number
  active: boolean
  onSelect: (dimension: DemoDimension) => void
  animateBars: boolean
}) {
  return (
    <button
      type="button"
      onMouseEnter={() => onSelect(dimension)}
      onFocus={() => onSelect(dimension)}
      onClick={() => onSelect(dimension)}
      className={cn(
        'flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left transition-colors',
        active
          ? 'border-l-primary bg-primary/[0.05]'
          : 'border-l-transparent hover:bg-foreground/[0.03]'
      )}
    >
      <span
        className={cn(
          'w-24 shrink-0 truncate text-sm font-medium',
          active ? 'text-foreground' : 'text-foreground/75'
        )}
      >
        {DIMENSION_LABELS[dimension]}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/10">
        <motion.div
          initial={animateBars ? { width: 0 } : false}
          animate={{ width: `${(score / 5) * 100}%` }}
          transition={{
            delay: animateBars ? 0.15 + index * 0.04 : 0,
            duration: 0.55,
            ease: [0.23, 1, 0.32, 1],
          }}
          className="h-full rounded-full"
          style={{ backgroundColor: scoreColor(score, 'bar') }}
        />
      </div>
      <span className="w-8 shrink-0 text-right font-mono text-sm text-foreground/60 tabular-nums">
        {formatScoreValue(score)}
      </span>
    </button>
  )
}

export function ProductPreview() {
  const transcriptScrollRef = useRef<HTMLDivElement>(null)
  const demo = useHeroProductDemo(transcriptScrollRef)

  const activeCandidate = DEMO_CANDIDATES[demo.activeCandidateId]
  const playbackProgress = progressFromTimeSec(demo.playbackTimeSec)

  const recommendationTone =
    activeCandidate.state === 'flag'
      ? 'bg-amber-400/10 ring-amber-400/25'
      : 'bg-emerald-400/10 ring-emerald-400/25'

  const onUserAction = () => {
    demo.handleUserInteraction()
  }

  const selectCandidate = (id: DemoCandidateId) => {
    onUserAction()
    demo.setActiveCandidateId(id)
    const candidate = DEMO_CANDIDATES[id]
    const lastSegment = candidate.transcript[candidate.transcript.length - 1]
    demo.setActiveSegmentId(lastSegment.id)
    demo.setActiveDimension(candidate.primaryEvidenceDimension)
    demo.setPlaybackTimeSec(lastSegment.timeSec)
    demo.setEvidenceVisible(true)
    demo.setRubricTab('evidence')
  }

  const selectSegment = (
    segmentId: string,
    timeSec: number,
    dimension?: DemoDimension
  ) => {
    onUserAction()
    demo.setActiveSegmentId(segmentId)
    demo.setPlaybackTimeSec(timeSec)
    if (dimension) {
      demo.setActiveDimension(dimension)
      demo.setRubricTab('evidence')
      demo.setEvidenceVisible(true)
    }
    demo.scrollToSegmentOnUserAction(segmentId)
  }

  const selectDimension = (dimension: DemoDimension) => {
    onUserAction()
    demo.setActiveDimension(dimension)
    demo.setRubricTab('rubric')
    const cited = activeCandidate.transcript.find(
      (segment) => segment.evidenceDimension === dimension
    )
    if (cited) {
      demo.setActiveSegmentId(cited.id)
      demo.setPlaybackTimeSec(cited.timeSec)
      demo.setEvidenceVisible(true)
      demo.setRubricTab('evidence')
      demo.scrollToSegmentOnUserAction(cited.id)
    } else {
      demo.setEvidenceVisible(false)
    }
  }

  const togglePlayback = () => {
    onUserAction()
    demo.setIsPlaying((playing) => !playing)
  }

  const isFocused = (area: DemoFocus) => demo.demoFocus === area

  return (
    <div
      className="relative text-left"
      style={{ width: HERO_PREVIEW_WIDTH, height: HERO_PREVIEW_HEIGHT }}
    >
      <div className="flex size-full flex-col overflow-hidden rounded-[1.15rem] bg-background">
        <div className="relative flex h-10 shrink-0 items-center border-b border-border/40 bg-muted/20 px-4">
          <div className="flex gap-1.5">
            <WindowDot className="bg-red-400/80" />
            <WindowDot className="bg-amber-400/80" />
            <WindowDot className="bg-emerald-400/80" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center gap-3">
            <span className="font-mono text-xs tracking-wide text-muted-foreground">
              Kyma · Recruiter review
            </span>
            <AnimatePresence>
              {demo.demoCaption ? (
                <motion.span
                  key={demo.demoCaption}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="hidden items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary sm:inline-flex"
                >
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                  {demo.demoCaption}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[220px] shrink-0 flex-col border-r border-border/40 bg-sidebar">
            <div className="flex h-14 items-center px-5">
              <Logo className="h-5 w-auto" />
            </div>
            <div className="px-3 py-2">
              <p className="px-3 pb-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Recruiter hub
              </p>
              <nav className="flex flex-col gap-0.5">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                      item.active
                        ? 'bg-primary/15 font-medium text-primary'
                        : 'text-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground'
                    )}
                  >
                    <item.icon className="size-4 shrink-0" stroke={1.6} />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col bg-background">
            <header
              className={cn(
                'shrink-0 rounded-none border-b border-border/40 px-6 py-4',
                focusRing(isFocused('recommendation'))
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    {activeCandidate.role}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                    {activeCandidate.name}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <IconMicrophone className="size-3.5" />
                    {activeCandidate.sessionLabel}
                  </p>
                </div>
                <div
                  className={cn(
                    'flex items-center gap-2.5 rounded-2xl px-4 py-2.5 ring-1',
                    recommendationTone
                  )}
                >
                  <IconCircleCheckFilled
                    className={cn(
                      'size-5',
                      activeCandidate.state === 'flag'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    )}
                  />
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                      Recommendation
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground">
                      {activeCandidate.recommendation} ·{' '}
                      {formatScoreValue(activeCandidate.overall)}/5 ·{' '}
                      {activeCandidate.confidence}
                    </p>
                  </div>
                </div>
              </div>
            </header>

            <div className="grid min-h-0 flex-1 grid-cols-[188px_minmax(0,1fr)_340px]">
              <div
                className={cn(
                  'flex flex-col gap-1 rounded-none border-r border-border/40 bg-muted/10 p-3',
                  focusRing(isFocused('queue'))
                )}
              >
                <p className="px-2 pb-1 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Review queue
                </p>
                {DEMO_QUEUE.map((candidateId) => {
                  const candidate = DEMO_CANDIDATES[candidateId]
                  const active = candidateId === demo.activeCandidateId
                  return (
                    <button
                      key={candidateId}
                      type="button"
                      onClick={() => selectCandidate(candidateId)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors',
                        active
                          ? 'bg-foreground/[0.06] ring-1 ring-border/50'
                          : 'hover:bg-foreground/[0.04]'
                      )}
                    >
                      <span
                        className={cn(
                          'size-2 shrink-0 rounded-full',
                          STATE_DOT[candidate.state]
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {candidate.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {candidate.role}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div
                className={cn(
                  'flex min-h-0 flex-col rounded-none',
                  focusRing(
                    isFocused('transcript') ||
                      isFocused('playback') ||
                      isFocused('simulation')
                  )
                )}
              >
                <div className="flex items-center justify-between border-b border-border/40 px-5 py-2.5">
                  <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    Transcript
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        'size-1.5 rounded-full',
                        demo.isPlaying
                          ? 'animate-pulse bg-primary'
                          : 'bg-emerald-400'
                      )}
                    />
                    {demo.isPlaying
                      ? 'Following playback'
                      : 'Synced to playback'}
                  </span>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden px-3 py-2">
                  <div
                    ref={transcriptScrollRef}
                    className="flex h-full flex-col gap-1 overflow-y-auto overscroll-y-contain pr-1"
                  >
                    {activeCandidate.transcript.map((segment) => {
                      const isActive = segment.id === demo.activeSegmentId
                      const isCited =
                        segment.cited ||
                        segment.evidenceDimension === demo.activeDimension

                      return (
                        <button
                          key={segment.id}
                          type="button"
                          data-segment-id={segment.id}
                          onClick={() =>
                            selectSegment(
                              segment.id,
                              segment.timeSec,
                              segment.evidenceDimension
                            )
                          }
                          className={cn(
                            'flex min-h-11 gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left transition-colors',
                            isActive
                              ? 'border-l-primary bg-primary/[0.06]'
                              : isCited
                                ? 'border-l-amber-500/70 bg-amber-500/[0.05]'
                                : 'border-l-transparent hover:bg-muted/15'
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  'flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase',
                                  segment.agent
                                    ? 'text-primary'
                                    : segment.simulation
                                      ? 'text-amber-400/90'
                                      : 'text-foreground/55'
                                )}
                              >
                                {segment.agent ? (
                                  <IconSparkles className="size-3" />
                                ) : null}
                                {segment.speaker}
                              </span>
                              {segment.simulation ? (
                                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                                  Teaching simulation
                                </span>
                              ) : null}
                              {segment.cited ? (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                                  {DIMENSION_LABELS[segment.evidenceDimension!]}{' '}
                                  · {formatDemoTimestamp(segment.timeSec)}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm leading-6 text-foreground/90">
                              {segment.text}
                            </p>
                          </div>
                          <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                            {formatDemoTimestamp(segment.timeSec)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div
                  className={cn(
                    'shrink-0 border-t border-border/40 px-5 py-3.5',
                    focusRing(isFocused('playback'))
                  )}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePlayback}
                      aria-label={
                        demo.isPlaying ? 'Pause playback' : 'Play playback'
                      }
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95',
                        demo.isPlaying &&
                          'shadow-[0_0_20px_-4px_rgba(232,255,71,0.5)]'
                      )}
                    >
                      {demo.isPlaying ? (
                        <IconPlayerPauseFilled className="size-4" />
                      ) : (
                        <IconPlayerPlayFilled className="size-4" />
                      )}
                    </button>
                    <span className="w-10 text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {formatDemoTimestamp(Math.floor(demo.playbackTimeSec))}
                    </span>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted/30">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full bg-primary/70"
                        animate={{ width: `${playbackProgress}%` }}
                        transition={{ duration: 0.12, ease: 'linear' }}
                      />
                    </div>
                    <span className="w-10 font-mono text-xs text-muted-foreground tabular-nums">
                      {formatDemoTimestamp(DEMO_TOTAL_DURATION_SEC)}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  'flex min-h-0 flex-col rounded-none border-l border-border/40 bg-muted/10',
                  focusRing(isFocused('rubric') || isFocused('evidence'))
                )}
              >
                <div className="flex items-center gap-1 border-b border-border/40 px-3 py-2">
                  {(['rubric', 'evidence', 'notes'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        onUserAction()
                        demo.setRubricTab(tab)
                        if (tab === 'evidence') {
                          demo.setEvidenceVisible(true)
                        }
                      }}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors',
                        demo.rubricTab === tab
                          ? 'bg-foreground/[0.08] text-foreground'
                          : 'text-muted-foreground/70 hover:text-muted-foreground'
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {demo.rubricTab === 'notes' ? (
                  <div className="flex flex-1 flex-col justify-center p-5 text-sm leading-6 text-muted-foreground">
                    <p className="font-medium text-foreground">
                      Recruiter note
                    </p>
                    <p className="mt-2">
                      Strong teaching metaphor on fractions. Worth a follow-up
                      on adaptability when students push back twice in a row.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="min-h-0 flex-1 overflow-y-auto py-1">
                      {RUBRIC_DIMENSIONS.map((dimension, index) => (
                        <RubricRow
                          key={`${demo.activeCandidateId}-${dimension}`}
                          dimension={dimension}
                          index={index}
                          score={activeCandidate.dimensionScores[dimension]}
                          active={demo.activeDimension === dimension}
                          onSelect={selectDimension}
                          animateBars={demo.rubricTab === 'rubric'}
                        />
                      ))}
                    </div>

                    <div className="shrink-0 border-t border-border/40 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                          Weighted overall
                        </span>
                        <span className="font-mono text-lg font-semibold text-foreground tabular-nums">
                          {formatScoreValue(activeCandidate.overall)}
                        </span>
                      </div>
                      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-foreground/10">
                        <motion.div
                          key={demo.activeCandidateId}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(activeCandidate.overall / 5) * 100}%`,
                          }}
                          transition={{
                            duration: 0.55,
                            ease: [0.23, 1, 0.32, 1],
                          }}
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: scoreColor(
                              activeCandidate.overall,
                              'bar'
                            ),
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {demo.evidenceVisible ? (
          <motion.div
            key={`${demo.activeCandidateId}-${demo.activeDimension}`}
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="pointer-events-none absolute right-5 bottom-[4.5rem] z-20 w-[288px] rounded-2xl border border-border/50 bg-card/95 p-4 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.06] backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300 ring-1 ring-amber-500/20">
                <IconQuote className="size-2.5" />
                {DIMENSION_LABELS[demo.activeDimension]} evidence
              </span>
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {formatDemoTimestamp(activeCandidate.evidenceTimeSec)}
              </span>
            </div>
            <p className="mt-2.5 text-sm leading-6 text-foreground">
              &ldquo;{activeCandidate.evidenceSnippet}&rdquo;
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {activeCandidate.evidenceRationale}
            </p>
            <p className="mt-3 text-[10px] font-medium tracking-wide text-primary uppercase">
              Jump to moment in transcript
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
