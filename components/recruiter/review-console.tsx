'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconVolume,
  IconVolume3,
  IconRewindBackward10,
  IconBrain,
  IconQuote,
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { formatDimensionLabel } from '@/lib/recruiter/format'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

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

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
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
  const [playbackRate, setPlaybackRate] = useState(1)

  const audioRef = useRef<HTMLAudioElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)

  // Compute relative start times for transcript segments
  const baseTimeMs = useMemo(() => {
    if (recordingStartTime) return new Date(recordingStartTime).getTime()
    if (transcript.length > 0)
      return new Date(transcript[0].startedAt).getTime()
    return Date.now()
  }, [recordingStartTime, transcript])

  const transcriptWithTimes = useMemo(() => {
    return transcript.map((segment) => {
      const startMs = new Date(segment.startedAt).getTime()
      const endMs = segment.endedAt
        ? new Date(segment.endedAt).getTime()
        : startMs + 3000 // fallback duration
      return {
        ...segment,
        startSec: Math.max(0, (startMs - baseTimeMs) / 1000),
        endSec: Math.max(0, (endMs - baseTimeMs) / 1000),
      }
    })
  }, [transcript, baseTimeMs])

  // Current active segment based on audio time
  const activeSegmentId = useMemo(() => {
    if (!isPlaying && currentTime === 0) return null
    const active = transcriptWithTimes.find(
      (s) => currentTime >= s.startSec && currentTime <= s.endSec
    )
    // If not found exactly, find the closest one that has started
    if (!active) {
      const pastSegments = transcriptWithTimes.filter(
        (s) => currentTime >= s.startSec
      )
      return pastSegments.length > 0
        ? pastSegments[pastSegments.length - 1].id
        : null
    }
    return active.id
  }, [currentTime, transcriptWithTimes, isPlaying])

  // Auto-scroll to active segment
  useEffect(() => {
    if (isPlaying && activeSegmentId && transcriptRef.current) {
      const activeEl = transcriptRef.current.querySelector(
        `[data-segment-id="${activeSegmentId}"]`
      )
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [activeSegmentId, isPlaying])

  // Filter evidence based on active dimension
  const activeEvidence = useMemo(() => {
    if (!activeDimension) return []
    return evidence.filter((e) => e.dimension === activeDimension)
  }, [activeDimension, evidence])

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (value: number | readonly number[]) => {
    const val = Array.isArray(value) ? value[0] : value
    if (audioRef.current && val !== undefined) {
      audioRef.current.currentTime = val
      setCurrentTime(val)
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (value: number | readonly number[]) => {
    const newVolume = Array.isArray(value) ? value[0] : value
    if (newVolume === undefined) return
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
      if (newVolume > 0 && isMuted) {
        setIsMuted(false)
        audioRef.current.muted = false
      } else if (newVolume === 0 && !isMuted) {
        setIsMuted(true)
        audioRef.current.muted = true
      }
    }
  }

  const jumpToTime = (timeSec: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timeSec
      setCurrentTime(timeSec)
      if (!isPlaying) {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2]
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length
    const newRate = rates[nextIndex]
    setPlaybackRate(newRate)
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
      {/* LEFT PANE: Transcript & Audio */}
      <div className="flex flex-col gap-6 rounded-3xl bg-card p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] ring-1 ring-border/50">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Audio & Transcript
            </h2>
            <p className="text-sm text-muted-foreground">
              Synced playback and AI citations.
            </p>
          </div>
          {audioUrl && (
            <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
              Recording Available
            </div>
          )}
        </div>

        {/* Transcript Area */}
        <ScrollArea className="h-[600px] w-full pr-4" ref={transcriptRef}>
          <div className="flex flex-col gap-4">
            {transcriptWithTimes.length ? (
              transcriptWithTimes.map((segment) => {
                const isActive = segment.id === activeSegmentId
                const isCandidate = segment.speaker === 'candidate'

                // Check if segment text contains any active evidence snippet
                let isCited = false
                if (activeDimension && activeEvidence.length > 0) {
                  isCited = activeEvidence.some(
                    (e) =>
                      segment.text
                        .toLowerCase()
                        .includes(e.snippet.toLowerCase().substring(0, 20)) ||
                      e.snippet
                        .toLowerCase()
                        .includes(segment.text.toLowerCase().substring(0, 20))
                  )
                }

                return (
                  <div
                    key={segment.id}
                    data-segment-id={segment.id}
                    className={cn(
                      'group flex gap-4 rounded-2xl p-4 transition-all duration-300',
                      isActive
                        ? 'bg-primary/5 ring-1 ring-primary/20'
                        : 'hover:bg-muted/30',
                      isCited && 'bg-amber-500/10 ring-1 ring-amber-500/30'
                    )}
                  >
                    <div className="flex flex-col items-center gap-2 pt-1">
                      <button
                        onClick={() => jumpToTime(segment.startSec)}
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90',
                          isCandidate
                            ? 'bg-indigo-500/10 text-indigo-600'
                            : 'bg-muted text-muted-foreground',
                          isActive &&
                            'ring-2 ring-primary/30 ring-offset-2 ring-offset-card'
                        )}
                        title="Play from here"
                      >
                        <IconPlayerPlay className="size-4" />
                      </button>
                      <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                        {formatTime(segment.startSec)}
                      </span>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold tracking-tight text-foreground">
                          {isCandidate
                            ? candidateName
                            : segment.speaker === 'agent'
                              ? 'AI Interviewer'
                              : 'System'}
                        </span>
                        {isCited && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-amber-700 uppercase dark:text-amber-400">
                            <IconQuote className="size-3" /> Citation
                          </span>
                        )}
                      </div>
                      <p
                        className={cn(
                          'text-sm leading-relaxed transition-colors',
                          isActive
                            ? 'text-foreground'
                            : 'text-muted-foreground',
                          isCited &&
                            'font-medium text-amber-900 dark:text-amber-200'
                        )}
                      >
                        {segment.text}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/10">
                <p className="text-sm font-medium text-muted-foreground">
                  No transcript available.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Audio Player Controls */}
        <div className="mt-auto rounded-2xl bg-muted/20 p-4 ring-1 ring-border/50">
          {audioUrl ? (
            <>
              <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-10 text-right text-xs font-medium text-muted-foreground tabular-nums">
                    {formatTime(currentTime)}
                  </span>
                  <Slider
                    value={[currentTime]}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="flex-1 cursor-pointer"
                  />
                  <span className="w-10 text-xs font-medium text-muted-foreground tabular-nums">
                    {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => jumpToTime(Math.max(0, currentTime - 10))}
                      className="size-8 rounded-full hover:bg-muted/50 active:scale-95"
                      nativeButton={false}
                    >
                      <IconRewindBackward10 className="size-4" />
                    </Button>
                    <Button
                      onClick={togglePlay}
                      className="size-10 rounded-full shadow-md transition-transform active:scale-95"
                      nativeButton={false}
                    >
                      {isPlaying ? (
                        <IconPlayerPause className="size-5" />
                      ) : (
                        <IconPlayerPlay className="ml-0.5 size-5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cyclePlaybackRate}
                      className="h-8 rounded-full px-3 text-xs font-semibold tabular-nums hover:bg-muted/50 active:scale-95"
                      nativeButton={false}
                    >
                      {playbackRate}x
                    </Button>
                  </div>

                  <div className="flex w-32 items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                      className="size-8 rounded-full hover:bg-muted/50 active:scale-95"
                      nativeButton={false}
                    >
                      {isMuted || volume === 0 ? (
                        <IconVolume3 className="size-4" />
                      ) : (
                        <IconVolume className="size-4" />
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
            <div className="flex h-16 items-center justify-center rounded-xl bg-muted/10">
              <p className="text-sm font-medium text-muted-foreground">
                No audio recording available for playback.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE: Rubric & Evidence */}
      <div className="flex flex-col gap-6">
        <div className="rounded-3xl bg-card p-6 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] ring-1 ring-border/50">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
              <IconBrain className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                AI Rubric Analysis
              </h2>
              <p className="text-sm text-muted-foreground">
                Click a score to highlight citations.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {dimensionScores.length ? (
              dimensionScores.map((score) => {
                const isActive = activeDimension === score.dimension
                return (
                  <button
                    key={score.dimension}
                    onClick={() =>
                      setActiveDimension(isActive ? null : score.dimension)
                    }
                    className={cn(
                      'group flex flex-col gap-2 rounded-2xl border px-4 py-4 text-left transition-all duration-300',
                      isActive
                        ? 'border-amber-500/30 bg-amber-500/5 shadow-sm ring-1 ring-amber-500/20'
                        : 'border-border/40 bg-muted/10 hover:border-border/60 hover:bg-muted/30'
                    )}
                  >
                    <div className="flex w-full items-center justify-between gap-4">
                      <p
                        className={cn(
                          'font-semibold tracking-tight',
                          isActive
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-foreground'
                        )}
                      >
                        {formatDimensionLabel(score.dimension)}
                      </p>
                      <div
                        className={cn(
                          'flex items-center justify-center rounded-full px-3 py-1 text-sm font-bold tabular-nums',
                          isActive
                            ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                            : 'bg-primary/10 text-primary'
                        )}
                      >
                        {score.score.toFixed(1)}{' '}
                        <span className="ml-1 font-medium opacity-50">/ 5</span>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                      {score.rationale}
                    </p>

                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 flex flex-col gap-2 overflow-hidden border-t border-amber-500/20 pt-3"
                        >
                          <p className="text-xs font-semibold tracking-wider text-amber-600/80 uppercase">
                            Cited Evidence
                          </p>
                          {activeEvidence.length > 0 ? (
                            activeEvidence.map((e, idx) => (
                              <div
                                key={idx}
                                className="rounded-lg bg-background/50 p-3 ring-1 ring-border/40"
                              >
                                <p className="line-clamp-3 text-xs text-muted-foreground italic">
                                  "{e.snippet}"
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No specific transcript snippets cited for this
                              dimension.
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                )
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No dimension scores available yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
