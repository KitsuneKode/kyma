'use client'

import {
  createContext,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { useShallow } from 'zustand/react/shallow'

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

type DimensionSummary = DimensionScore & {
  evidenceCount: number
  evidence: EvidenceWithTiming[]
}

const PLAYBACK_RATES = [1, 1.25, 1.5, 2] as const
type PlaybackRate = (typeof PLAYBACK_RATES)[number]

/**
 * High-frequency, mutable playback/focus state lives in a per-provider Zustand
 * store so consumers can subscribe to narrow slices via selectors. This keeps
 * the rubric/focus panels from re-rendering on every audio `timeupdate` tick.
 */
type ReviewStoreState = {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  playbackRate: PlaybackRate
  rateTransitioning: boolean
  activeDimensionOverride: string | null
  transcriptMode: 'all' | 'cited'
  focusedEvidenceIndex: number
}

function createReviewStore() {
  return createStore<ReviewStoreState>()(() => ({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    playbackRate: 1,
    rateTransitioning: false,
    activeDimensionOverride: null,
    transcriptMode: 'all',
    focusedEvidenceIndex: 0,
  }))
}

type ReviewActions = {
  audioRef: React.RefObject<HTMLAudioElement | null>
  transcriptRef: React.RefObject<HTMLDivElement | null>
  togglePlay: () => void
  stopPlayback: () => void
  handleTimeUpdate: () => void
  handleLoadedMetadata: () => void
  handleSeek: (value: number | readonly number[]) => void
  toggleMute: () => void
  handleVolumeChange: (value: number | readonly number[]) => void
  jumpToTime: (timeSec?: number) => void
  cyclePlaybackRate: () => void
  setActiveDimension: (dimension: string | null) => void
  setTranscriptMode: (mode: 'all' | 'cited') => void
  setFocusedEvidenceIndex: (index: number) => void
}

type ReviewData = {
  candidateName: string
  audioUrl?: string
  recordingStartTime?: string
  sessionEvents: CandidateReviewDetail['events']
  transcriptWithTimes: TranscriptSegmentWithTiming[]
  evidenceWithTiming: EvidenceWithTiming[]
  dimensionScores: DimensionScore[]
  dimensionSummaries: DimensionSummary[]
  defaultActiveDimension: string | null
  weightedScore?: number | null
  hardGateTriggered: boolean
}

const ReviewStoreContext = createContext<StoreApi<ReviewStoreState> | null>(
  null
)
const ReviewActionsContext = createContext<ReviewActions | null>(null)
const ReviewDataContext = createContext<ReviewData | null>(null)

function normaliseSnippet(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenizeSnippet(value: string) {
  return normaliseSnippet(value)
    .split(' ')
    .filter((token) => token.length > 2)
}

function segmentMatchesEvidence(
  segment: TranscriptSegmentWithTiming,
  evidenceItem: EvidenceWithTiming
) {
  const segmentText = normaliseSnippet(segment.text)
  const snippetText = normaliseSnippet(evidenceItem.snippet)

  if (!segmentText || !snippetText) return false

  if (segmentText.includes(snippetText) || snippetText.includes(segmentText)) {
    return true
  }

  const snippetTokens = tokenizeSnippet(evidenceItem.snippet)
  if (snippetTokens.length === 0) return false

  const segmentTokens = tokenizeSnippet(segment.text)
  const snippetTokenSet = new Set(snippetTokens)
  const matchedTokens = segmentTokens.filter((token) =>
    snippetTokenSet.has(token)
  ).length
  const overlapRatio = matchedTokens / snippetTokens.length
  const minimumMatches = Math.min(3, snippetTokens.length)

  return overlapRatio >= 0.6 && matchedTokens >= minimumMatches
}

type ReviewProviderProps = {
  candidateName: string
  transcript: TranscriptSegment[]
  evidence: Evidence[]
  dimensionScores: DimensionScore[]
  sessionEvents?: CandidateReviewDetail['events']
  weightedScore?: number | null
  hardGateTriggered?: boolean
  audioUrl?: string
  recordingStartTime?: string
  children: ReactNode
}

export function ReviewProvider({
  candidateName,
  transcript,
  evidence,
  dimensionScores,
  sessionEvents = [],
  weightedScore,
  hardGateTriggered = false,
  audioUrl,
  recordingStartTime,
  children,
}: ReviewProviderProps) {
  const storeRef = useRef<StoreApi<ReviewStoreState>>(null)
  if (storeRef.current === null) {
    storeRef.current = createReviewStore()
  }
  const store = storeRef.current

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

  const dimensionSummaries = useMemo<DimensionSummary[]>(() => {
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

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (store.getState().isPlaying) {
      audio.pause()
      store.setState({ isPlaying: false })
      return
    }
    void audio.play()
    store.setState({ isPlaying: true })
  }, [store])

  const stopPlayback = useCallback(() => {
    store.setState({ isPlaying: false })
  }, [store])

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current)
      store.setState({ currentTime: audioRef.current.currentTime })
  }, [store])

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current)
      store.setState({ duration: audioRef.current.duration })
  }, [store])

  const handleSeek = useCallback(
    (value: number | readonly number[]) => {
      const nextTime = Array.isArray(value) ? value[0] : (value as number)
      if (!audioRef.current || nextTime === undefined) return
      audioRef.current.currentTime = nextTime
      store.setState({ currentTime: nextTime })
    },
    [store]
  )

  const toggleMute = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const nextMuted = !store.getState().isMuted
    audio.muted = nextMuted
    store.setState({ isMuted: nextMuted })
  }, [store])

  const handleVolumeChange = useCallback(
    (value: number | readonly number[]) => {
      const nextVolume = Array.isArray(value) ? value[0] : (value as number)
      if (nextVolume === undefined) return
      store.setState({ volume: nextVolume })
      const audio = audioRef.current
      if (!audio) return
      audio.volume = nextVolume
      if (nextVolume > 0 && store.getState().isMuted) {
        store.setState({ isMuted: false })
        audio.muted = false
      } else if (nextVolume === 0 && !store.getState().isMuted) {
        store.setState({ isMuted: true })
        audio.muted = true
      }
    },
    [store]
  )

  const jumpToTime = useCallback(
    (timeSec?: number) => {
      if (!audioRef.current || timeSec === undefined) return
      audioRef.current.currentTime = timeSec
      store.setState({ currentTime: timeSec })
      if (!store.getState().isPlaying) {
        void audioRef.current.play()
        store.setState({ isPlaying: true })
      }
    },
    [store]
  )

  const cyclePlaybackRate = useCallback(() => {
    store.setState({ rateTransitioning: true })
    const current = store.getState().playbackRate
    const nextIndex =
      (PLAYBACK_RATES.indexOf(current) + 1) % PLAYBACK_RATES.length
    const nextRate = PLAYBACK_RATES[nextIndex]
    setTimeout(() => {
      store.setState({ playbackRate: nextRate, rateTransitioning: false })
      if (audioRef.current) audioRef.current.playbackRate = nextRate
    }, 80)
  }, [store])

  const setActiveDimension = useCallback(
    (dimension: string | null) => {
      store.setState({
        activeDimensionOverride: dimension,
        focusedEvidenceIndex: 0,
      })
    },
    [store]
  )

  const setTranscriptMode = useCallback(
    (mode: 'all' | 'cited') => {
      store.setState({ transcriptMode: mode })
    },
    [store]
  )

  const setFocusedEvidenceIndex = useCallback(
    (index: number) => {
      store.setState({ focusedEvidenceIndex: index })
    },
    [store]
  )

  const actions = useMemo<ReviewActions>(
    () => ({
      audioRef,
      transcriptRef,
      togglePlay,
      stopPlayback,
      handleTimeUpdate,
      handleLoadedMetadata,
      handleSeek,
      toggleMute,
      handleVolumeChange,
      jumpToTime,
      cyclePlaybackRate,
      setActiveDimension,
      setTranscriptMode,
      setFocusedEvidenceIndex,
    }),
    [
      togglePlay,
      stopPlayback,
      handleTimeUpdate,
      handleLoadedMetadata,
      handleSeek,
      toggleMute,
      handleVolumeChange,
      jumpToTime,
      cyclePlaybackRate,
      setActiveDimension,
      setTranscriptMode,
      setFocusedEvidenceIndex,
    ]
  )

  const data = useMemo<ReviewData>(
    () => ({
      candidateName,
      audioUrl,
      recordingStartTime,
      sessionEvents,
      transcriptWithTimes,
      evidenceWithTiming,
      dimensionScores,
      dimensionSummaries,
      defaultActiveDimension,
      weightedScore,
      hardGateTriggered,
    }),
    [
      candidateName,
      audioUrl,
      recordingStartTime,
      sessionEvents,
      transcriptWithTimes,
      evidenceWithTiming,
      dimensionScores,
      dimensionSummaries,
      defaultActiveDimension,
      weightedScore,
      hardGateTriggered,
    ]
  )

  return (
    <ReviewStoreContext.Provider value={store}>
      <ReviewActionsContext.Provider value={actions}>
        <ReviewDataContext.Provider value={data}>
          {children}
        </ReviewDataContext.Provider>
      </ReviewActionsContext.Provider>
    </ReviewStoreContext.Provider>
  )
}

function useReviewStoreApi() {
  const store = useContext(ReviewStoreContext)
  if (!store) {
    throw new Error('useReviewStore must be used within ReviewProvider')
  }
  return store
}

export function useReviewStore<T>(selector: (state: ReviewStoreState) => T): T {
  return useStore(useReviewStoreApi(), selector)
}

export function useReviewData() {
  const data = useContext(ReviewDataContext)
  if (!data) {
    throw new Error('useReviewData must be used within ReviewProvider')
  }
  return data
}

export function useReviewActions() {
  const actions = useContext(ReviewActionsContext)
  if (!actions) {
    throw new Error('useReviewActions must be used within ReviewProvider')
  }
  return actions
}

/** Resolved active dimension (override or default); only re-renders on change. */
export function useReviewActiveDimension() {
  const override = useReviewStore((state) => state.activeDimensionOverride)
  const { defaultActiveDimension } = useReviewData()
  return override ?? defaultActiveDimension
}

export function useReviewPlayback() {
  const slice = useReviewStore(
    useShallow((state) => ({
      isPlaying: state.isPlaying,
      currentTime: state.currentTime,
      duration: state.duration,
      volume: state.volume,
      isMuted: state.isMuted,
      playbackRate: state.playbackRate,
      rateTransitioning: state.rateTransitioning,
    }))
  )
  const actions = useReviewActions()
  const playedPct =
    slice.duration > 0 ? (slice.currentTime / slice.duration) * 100 : 0

  return {
    ...slice,
    audioRef: actions.audioRef,
    togglePlay: actions.togglePlay,
    stopPlayback: actions.stopPlayback,
    handleTimeUpdate: actions.handleTimeUpdate,
    handleLoadedMetadata: actions.handleLoadedMetadata,
    handleSeek: actions.handleSeek,
    toggleMute: actions.toggleMute,
    handleVolumeChange: actions.handleVolumeChange,
    jumpToTime: actions.jumpToTime,
    cyclePlaybackRate: actions.cyclePlaybackRate,
    playedPct,
  }
}

export function useReviewFocus() {
  const { transcriptWithTimes, evidenceWithTiming } = useReviewData()
  const actions = useReviewActions()
  const transcriptMode = useReviewStore((state) => state.transcriptMode)
  const currentTime = useReviewStore((state) => state.currentTime)
  const isPlaying = useReviewStore((state) => state.isPlaying)
  const resolvedActiveDimension = useReviewActiveDimension()
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
    if (!isPlaying || !activeSegmentId || !actions.transcriptRef.current) return
    const activeEl = actions.transcriptRef.current.querySelector(
      `[data-segment-id="${activeSegmentId}"]`
    )
    if (activeEl instanceof HTMLElement) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [actions.transcriptRef, activeSegmentId, isPlaying])

  return {
    activeDimension: resolvedActiveDimension,
    setActiveDimension: actions.setActiveDimension,
    transcriptMode,
    setTranscriptMode: actions.setTranscriptMode,
    deferredActiveDimension,
    activeEvidence,
    citedSegmentIds,
    visibleTranscript,
    activeSegmentId,
    transcriptRef: actions.transcriptRef,
  }
}
