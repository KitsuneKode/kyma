'use client'

import {
  createContext,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type { CandidateReviewDetail } from '@/components/recruiter/candidate-review-workspace'

type TranscriptSegment = CandidateReviewDetail['transcript'][number]
type Evidence = CandidateReviewDetail['evidence'][number]
type DimensionScore = NonNullable<
  CandidateReviewDetail['report']
>['dimensionScores'][number]

type TranscriptSegmentWithTiming = TranscriptSegment & {
  startSec: number
  endSec: number
}

type EvidenceWithTiming = Evidence & {
  startedAtSec?: number
}

type ReviewPlaybackState = {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  playbackRate: number
  rateTransitioning: boolean
  audioRef: React.RefObject<HTMLAudioElement | null>
  togglePlay: () => void
  handleTimeUpdate: () => void
  handleLoadedMetadata: () => void
  handleSeek: (value: number | readonly number[]) => void
  toggleMute: () => void
  handleVolumeChange: (value: number | readonly number[]) => void
  jumpToTime: (timeSec?: number) => void
  cyclePlaybackRate: () => void
  stopPlayback: () => void
  playedPct: number
}

type ReviewFocusState = {
  activeDimension: string | null
  setActiveDimension: (dimension: string | null) => void
  transcriptMode: 'all' | 'cited'
  setTranscriptMode: (mode: 'all' | 'cited') => void
  deferredActiveDimension: string | null
  activeEvidence: EvidenceWithTiming[]
  citedSegmentIds: Set<string>
  visibleTranscript: TranscriptSegmentWithTiming[]
  activeSegmentId: string | null
  transcriptRef: React.RefObject<HTMLDivElement | null>
}

type ReviewContextValue = {
  candidateName: string
  transcript: TranscriptSegment[]
  evidence: Evidence[]
  dimensionScores: DimensionScore[]
  audioUrl?: string
  recordingStartTime?: string
  transcriptWithTimes: TranscriptSegmentWithTiming[]
  evidenceWithTiming: EvidenceWithTiming[]
  dimensionSummaries: Array<
    DimensionScore & {
      evidenceCount: number
      evidence: EvidenceWithTiming[]
    }
  >
  playback: ReviewPlaybackState
  focus: ReviewFocusState
}

const ReviewContext = createContext<ReviewContextValue | null>(null)

const PLAYBACK_RATES = [1, 1.25, 1.5, 2] as const

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

type ReviewProviderProps = {
  candidateName: string
  transcript: TranscriptSegment[]
  evidence: Evidence[]
  dimensionScores: DimensionScore[]
  audioUrl?: string
  recordingStartTime?: string
  children: ReactNode
}

export function ReviewProvider({
  candidateName,
  transcript,
  evidence,
  dimensionScores,
  audioUrl,
  recordingStartTime,
  children,
}: ReviewProviderProps) {
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

  const defaultActiveDimension = useMemo(() => {
    if (dimensionSummaries.length === 0) return null

    return (
      dimensionSummaries.toSorted((left, right) => {
        if (left.score !== right.score) return left.score - right.score
        return right.evidenceCount - left.evidenceCount
      })[0]?.dimension ?? null
    )
  }, [dimensionSummaries])

  const resolvedActiveDimension = activeDimension ?? defaultActiveDimension
  const deferredActiveDimension = useDeferredValue(resolvedActiveDimension)

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
    if (transcriptMode === 'all' || !resolvedActiveDimension)
      return transcriptWithTimes
    return transcriptWithTimes.filter((segment) =>
      citedSegmentIds.has(segment.id)
    )
  }, [
    citedSegmentIds,
    resolvedActiveDimension,
    transcriptMode,
    transcriptWithTimes,
  ])

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

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      return
    }
    void audioRef.current.play()
    setIsPlaying(true)
  }, [isPlaying])

  const stopPlayback = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration)
  }, [])

  const handleSeek = useCallback((value: number | readonly number[]) => {
    const nextTime = Array.isArray(value) ? value[0] : value
    if (!audioRef.current || nextTime === undefined) return
    audioRef.current.currentTime = nextTime
    setCurrentTime(nextTime)
  }, [])

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return
    const nextMuted = !isMuted
    audioRef.current.muted = nextMuted
    setIsMuted(nextMuted)
  }, [isMuted])

  const handleVolumeChange = useCallback(
    (value: number | readonly number[]) => {
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
    },
    [isMuted]
  )

  const jumpToTime = useCallback(
    (timeSec?: number) => {
      if (!audioRef.current || timeSec === undefined) return
      audioRef.current.currentTime = timeSec
      setCurrentTime(timeSec)
      if (!isPlaying) {
        void audioRef.current.play()
        setIsPlaying(true)
      }
    },
    [isPlaying]
  )

  const cyclePlaybackRate = useCallback(() => {
    setRateTransitioning(true)
    const nextIndex =
      (PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length
    const nextRate = PLAYBACK_RATES[nextIndex]
    setTimeout(() => {
      setPlaybackRate(nextRate)
      if (audioRef.current) audioRef.current.playbackRate = nextRate
      setRateTransitioning(false)
    }, 80)
  }, [playbackRate])

  const playedPct = duration > 0 ? (currentTime / duration) * 100 : 0

  const value = useMemo<ReviewContextValue>(
    () => ({
      candidateName,
      transcript,
      evidence,
      dimensionScores,
      audioUrl,
      recordingStartTime,
      transcriptWithTimes,
      evidenceWithTiming,
      dimensionSummaries,
      playback: {
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        playbackRate,
        rateTransitioning,
        audioRef,
        togglePlay,
        handleTimeUpdate,
        handleLoadedMetadata,
        handleSeek,
        toggleMute,
        handleVolumeChange,
        jumpToTime,
        cyclePlaybackRate,
        stopPlayback,
        playedPct,
      },
      focus: {
        activeDimension: resolvedActiveDimension,
        setActiveDimension,
        transcriptMode,
        setTranscriptMode,
        deferredActiveDimension,
        activeEvidence,
        citedSegmentIds,
        visibleTranscript,
        activeSegmentId,
        transcriptRef,
      },
    }),
    [
      activeEvidence,
      activeSegmentId,
      audioUrl,
      candidateName,
      citedSegmentIds,
      currentTime,
      deferredActiveDimension,
      dimensionScores,
      dimensionSummaries,
      duration,
      evidence,
      evidenceWithTiming,
      isMuted,
      isPlaying,
      playbackRate,
      playedPct,
      rateTransitioning,
      recordingStartTime,
      resolvedActiveDimension,
      transcript,
      transcriptMode,
      transcriptWithTimes,
      playedPct,
      togglePlay,
      handleTimeUpdate,
      handleLoadedMetadata,
      handleSeek,
      toggleMute,
      handleVolumeChange,
      jumpToTime,
      cyclePlaybackRate,
      stopPlayback,
    ]
  )

  return (
    <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>
  )
}

export function useReviewContext() {
  const context = useContext(ReviewContext)
  if (!context) {
    throw new Error('useReviewContext must be used within ReviewProvider')
  }
  return context
}

export function useReviewPlayback() {
  return useReviewContext().playback
}

export function useReviewFocus() {
  return useReviewContext().focus
}
