'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  IconMessageCircle,
  IconPlayerPause,
  IconPlayerPlay,
  IconRewindBackward10,
  IconVolume,
  IconVolume3,
} from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { formatDimensionLabel } from '@/lib/recruiter/format'
import { cn } from '@/lib/utils'
import { RubricVerdict } from './rubric-verdict'

type TranscriptSegment = {
  id: string
  speaker: 'agent' | 'candidate' | 'system'
  text: string
  status: 'partial' | 'final'
  startedAt: string
  endedAt?: string
}

type Evidence = {
  id: string
  dimension: string
  snippet: string
  rationale: string
  startedAt?: string
}

type DimensionScore = {
  dimension: string
  score: number
  rationale: string
}

type ReviewConsoleProps = {
  candidateName: string
  transcript: TranscriptSegment[]
  evidence: Evidence[]
  dimensionScores: DimensionScore[]
  audioUrl?: string
  recordingStartTime?: string
}

type TranscriptSegmentWithTiming = TranscriptSegment & {
  startSec: number
  endSec: number
}

type EvidenceWithTiming = Evidence & {
  startedAtSec?: number
}

const PLAYBACK_RATES = [1, 1.25, 1.5, 2] as const

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function normaliseSnippet(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function segmentMatchesEvidence(
  segment: TranscriptSegmentWithTiming,
  evidenceItem: EvidenceWithTiming
) {
  const segmentText = normaliseSnippet(segment.text)
  const snippetText = normaliseSnippet(evidenceItem.snippet)

  if (!segmentText || !snippetText) return false
  if (segmentText.includes(snippetText) || snippetText.includes(segmentText))
    return true

  const snippetWindow = snippetText.slice(0, 56)
  const segmentWindow = segmentText.slice(0, 56)
  return (
    segmentText.includes(snippetWindow) || snippetText.includes(segmentWindow)
  )
}

export function ReviewConsole({
  candidateName,
  transcript,
  evidence,
  dimensionScores,
  audioUrl,
  recordingStartTime,
}: ReviewConsoleProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [activeDimension, setActiveDimension] = useState<string | null>(null)
  const [playbackRate, setPlaybackRate] =
    useState<(typeof PLAYBACK_RATES)[number]>(1)
  const [transcriptMode, setTranscriptMode] = useState<'all' | 'cited'>('all')
  const [rateTransitioning, setRateTransitioning] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)

  const baseTimeMs = useMemo(() => {
    if (recordingStartTime) return new Date(recordingStartTime).getTime()
    if (transcript.length > 0)
      return new Date(transcript[0].startedAt).getTime()
    return Date.now()
  }, [recordingStartTime, transcript])

  const transcriptWithTimes = useMemo<TranscriptSegmentWithTiming[]>(() => {
    return transcript.map((segment) => {
      const startMs = new Date(segment.startedAt).getTime()
      const endMs = segment.endedAt
        ? new Date(segment.endedAt).getTime()
        : startMs + 3000

      return {
        ...segment,
        startSec: Math.max(0, (startMs - baseTimeMs) / 1000),
        endSec: Math.max(0, (endMs - baseTimeMs) / 1000),
      }
    })
  }, [baseTimeMs, transcript])

  const evidenceWithTiming = useMemo<EvidenceWithTiming[]>(() => {
    return evidence.map((item) => ({
      ...item,
      startedAtSec: item.startedAt
        ? Math.max(0, (new Date(item.startedAt).getTime() - baseTimeMs) / 1000)
        : undefined,
    }))
  }, [baseTimeMs, evidence])

  const dimensionSummaries = useMemo(() => {
    return dimensionScores.map((score) => {
      const dimensionEvidence = evidenceWithTiming.filter(
        (item) => item.dimension === score.dimension
      )
      return {
        ...score,
        evidenceCount: dimensionEvidence.length,
        evidence: dimensionEvidence,
      }
    })
  }, [dimensionScores, evidenceWithTiming])

  useEffect(() => {
    if (activeDimension || dimensionSummaries.length === 0) return

    const initialDimension =
      dimensionSummaries.toSorted((left, right) => {
        if (left.score !== right.score) return left.score - right.score
        return right.evidenceCount - left.evidenceCount
      })[0]?.dimension ?? null

    setActiveDimension(initialDimension)
  }, [activeDimension, dimensionSummaries])

  const deferredActiveDimension = useDeferredValue(activeDimension)

  const activeEvidence = useMemo(() => {
    if (!deferredActiveDimension) return []
    return evidenceWithTiming.filter(
      (item) => item.dimension === deferredActiveDimension
    )
  }, [deferredActiveDimension, evidenceWithTiming])

  const citedSegmentIds = useMemo(() => {
    if (!activeEvidence.length) return new Set<string>()
    return new Set(
      transcriptWithTimes
        .filter((segment) =>
          activeEvidence.some((item) => segmentMatchesEvidence(segment, item))
        )
        .map((segment) => segment.id)
    )
  }, [activeEvidence, transcriptWithTimes])

  const visibleTranscript = useMemo(() => {
    if (transcriptMode === 'all' || !activeDimension) return transcriptWithTimes
    return transcriptWithTimes.filter((segment) =>
      citedSegmentIds.has(segment.id)
    )
  }, [activeDimension, citedSegmentIds, transcriptMode, transcriptWithTimes])

  const activeSegmentId = useMemo(() => {
    if (!isPlaying && currentTime === 0) return null
    const active = transcriptWithTimes.find(
      (segment) =>
        currentTime >= segment.startSec && currentTime <= segment.endSec
    )
    if (active) return active.id

    const pastSegments = transcriptWithTimes.filter(
      (segment) => currentTime >= segment.startSec
    )
    return pastSegments.length > 0 ? (pastSegments.at(-1)?.id ?? null) : null
  }, [currentTime, isPlaying, transcriptWithTimes])

  useEffect(() => {
    if (!isPlaying || !activeSegmentId || !transcriptRef.current) return
    const activeEl = transcriptRef.current.querySelector(
      `[data-segment-id="${activeSegmentId}"]`
    )
    if (activeEl instanceof HTMLElement) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeSegmentId, isPlaying])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      return
    }
    void audioRef.current.play()
    setIsPlaying(true)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration)
  }

  const handleSeek = (value: number | readonly number[]) => {
    const nextTime = Array.isArray(value) ? value[0] : value
    if (!audioRef.current || nextTime === undefined) return
    audioRef.current.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    const nextMuted = !isMuted
    audioRef.current.muted = nextMuted
    setIsMuted(nextMuted)
  }

  const handleVolumeChange = (value: number | readonly number[]) => {
    const nextVolume = Array.isArray(value) ? value[0] : value
    if (nextVolume === undefined) return
    setVolume(nextVolume)
    if (!audioRef.current) return
    audioRef.current.volume = nextVolume
    if (nextVolume > 0 && isMuted) {
      setIsMuted(false)
      audioRef.current.muted = false
    } else if (nextVolume === 0 && !isMuted) {
      setIsMuted(true)
      audioRef.current.muted = true
    }
  }

  const jumpToTime = (timeSec?: number) => {
    if (!audioRef.current || timeSec === undefined) return
    audioRef.current.currentTime = timeSec
    setCurrentTime(timeSec)
    if (!isPlaying) {
      void audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const cyclePlaybackRate = () => {
    setRateTransitioning(true)
    const nextIndex =
      (PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length
    const nextRate = PLAYBACK_RATES[nextIndex]
    setTimeout(() => {
      setPlaybackRate(nextRate)
      if (audioRef.current) audioRef.current.playbackRate = nextRate
      setRateTransitioning(false)
    }, 80)
  }

  const playedPct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={transcriptMode === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTranscriptMode('all')}
          >
            Full transcript
          </Button>
          <Button
            type="button"
            variant={transcriptMode === 'cited' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTranscriptMode('cited')}
            disabled={!activeDimension}
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

        <ScrollArea className="h-[600px] w-full pr-3" ref={transcriptRef}>
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
                      'group flex gap-3 rounded-lg border-l-2 px-3 py-2.5 text-left transition-[border-color,background-color] duration-200',
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

        <div className="rounded-[28px] bg-card/80 p-4 ring-1 ring-border/40">
          {audioUrl ? (
            <>
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                className="hidden"
              />
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-10 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
                    {formatTime(currentTime)}
                  </span>
                  <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-0 flex items-center">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
                        <div
                          className="h-full rounded-full bg-primary/40 transition-[width] duration-100"
                          style={{ width: `${playedPct}%` }}
                        />
                      </div>
                    </div>
                    <Slider
                      value={[currentTime]}
                      max={duration || 100}
                      step={0.1}
                      onValueChange={handleSeek}
                      className="relative cursor-pointer"
                    />
                  </div>
                  <span className="w-10 font-mono text-[11px] text-muted-foreground tabular-nums">
                    {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-[20px]">
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => jumpToTime(Math.max(0, currentTime - 10))}
                      className="rounded-full"
                    >
                      <IconRewindBackward10 className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      onClick={togglePlay}
                      className="size-9 rounded-full"
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={isPlaying ? 'pause' : 'play'}
                          initial={{ opacity: 0, filter: 'blur(2px)' }}
                          animate={{ opacity: 1, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, filter: 'blur(2px)' }}
                          transition={{ duration: 0.16 }}
                          className="flex items-center justify-center"
                        >
                          {isPlaying ? (
                            <IconPlayerPause className="size-4" />
                          ) : (
                            <IconPlayerPlay className="ml-0.5 size-4" />
                          )}
                        </motion.span>
                      </AnimatePresence>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={cyclePlaybackRate}
                      className={cn(
                        'rounded-full px-2.5 font-mono text-xs tabular-nums transition-[opacity,filter] duration-100',
                        rateTransitioning && 'opacity-50 blur-[1px]'
                      )}
                    >
                      {playbackRate}x
                    </Button>
                  </div>

                  <div className="hidden items-center gap-1.5 sm:flex">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={toggleMute}
                      className="rounded-full"
                    >
                      {isMuted || volume === 0 ? (
                        <IconVolume3 className="size-3.5" />
                      ) : (
                        <IconVolume className="size-3.5" />
                      )}
                    </Button>
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      max={1}
                      step={0.01}
                      onValueChange={handleVolumeChange}
                      className="w-20 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-14 items-center justify-center rounded-[20px] bg-muted/15">
              <p className="text-sm text-muted-foreground">
                No audio recording available.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <RubricVerdict
          dimensionScores={dimensionScores}
          evidence={evidenceWithTiming}
          activeDimension={activeDimension}
          onSelectDimension={setActiveDimension}
          onJumpToTime={jumpToTime}
        />
      </div>
    </section>
  )
}
