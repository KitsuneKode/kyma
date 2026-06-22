'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  DEMO_CANDIDATES,
  DEMO_TOTAL_DURATION_SEC,
  type DemoCandidateId,
  type DemoDimension,
  type DemoFocus,
  runAaravReviewDemo,
  sleep,
} from '@/lib/marketing/hero-product-demo'
import { scrollSegmentInContainer } from '@/lib/marketing/transcript-scroll'

type RubricTab = 'rubric' | 'evidence' | 'notes'

export function useHeroProductDemo(
  transcriptScrollRef: React.RefObject<HTMLDivElement | null>
) {
  const [activeCandidateId, setActiveCandidateId] =
    useState<DemoCandidateId>('aarav')
  const [activeSegmentId, setActiveSegmentId] = useState('t1')
  const [activeDimension, setActiveDimension] =
    useState<DemoDimension>('clarity')
  const [playbackTimeSec, setPlaybackTimeSec] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [evidenceVisible, setEvidenceVisible] = useState(false)
  const [rubricTab, setRubricTab] = useState<RubricTab>('rubric')
  const [demoFocus, setDemoFocus] = useState<DemoFocus | null>(null)
  const [demoCaption, setDemoCaption] = useState<string | null>(null)

  const pauseUntilRef = useRef(0)
  const demoRunningRef = useRef(false)
  const cancelledRef = useRef(false)
  const activeSegmentIdRef = useRef(activeSegmentId)

  useEffect(() => {
    activeSegmentIdRef.current = activeSegmentId
  }, [activeSegmentId])

  const pauseForUser = useCallback((ms = 14000) => {
    pauseUntilRef.current = Date.now() + ms
    setIsPlaying(false)
    setDemoCaption(null)
    setDemoFocus(null)
  }, [])

  /** Only for explicit user clicks — never during auto-demo or playback sync. */
  const scrollToSegmentOnUserAction = useCallback(
    (segmentId: string) => {
      const root = transcriptScrollRef.current
      if (!root) return
      scrollSegmentInContainer(root, segmentId, { behavior: 'auto' })
    },
    [transcriptScrollRef]
  )

  const handleUserInteraction = useCallback(() => {
    pauseForUser()
  }, [pauseForUser])

  useEffect(() => {
    if (!isPlaying) return

    const interval = window.setInterval(() => {
      setPlaybackTimeSec((current) => {
        const next = current + 2.8
        if (next >= DEMO_TOTAL_DURATION_SEC) {
          window.clearInterval(interval)
          setIsPlaying(false)
          return DEMO_TOTAL_DURATION_SEC
        }
        return next
      })
    }, 80)

    return () => window.clearInterval(interval)
  }, [isPlaying])

  // Highlight the active turn during playback — no scrolling.
  useEffect(() => {
    const candidate = DEMO_CANDIDATES[activeCandidateId]
    let match = candidate.transcript[0]
    for (const segment of candidate.transcript) {
      if (segment.timeSec <= playbackTimeSec) {
        match = segment
      } else {
        break
      }
    }

    if (match.id !== activeSegmentIdRef.current) {
      setActiveSegmentId(match.id)
    }
  }, [activeCandidateId, playbackTimeSec])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActiveCandidateId('aarav')
      setActiveSegmentId('t6')
      setActiveDimension('simplification')
      setPlaybackTimeSec(372)
      setEvidenceVisible(true)
      setRubricTab('evidence')
      return
    }

    cancelledRef.current = false

    const loop = async () => {
      await sleep(1200)

      while (!cancelledRef.current) {
        while (!cancelledRef.current && Date.now() < pauseUntilRef.current) {
          await sleep(250)
        }

        if (cancelledRef.current) break

        demoRunningRef.current = true
        await runAaravReviewDemo({
          pauseForUser,
          isPaused: () =>
            cancelledRef.current || Date.now() < pauseUntilRef.current,
          setCandidate: setActiveCandidateId,
          setSegment: setActiveSegmentId,
          setDimension: setActiveDimension,
          setProgressSec: setPlaybackTimeSec,
          setPlaying: setIsPlaying,
          setEvidenceVisible: setEvidenceVisible,
          setRubricTab: setRubricTab,
          setFocus: setDemoFocus,
          setCaption: setDemoCaption,
        })
        demoRunningRef.current = false

        if (cancelledRef.current) break

        setDemoFocus(null)
        setDemoCaption(null)
        setEvidenceVisible(false)
        setIsPlaying(false)
        await sleep(900)
      }
    }

    void loop()

    return () => {
      cancelledRef.current = true
      demoRunningRef.current = false
    }
  }, [pauseForUser])

  return {
    activeCandidateId,
    setActiveCandidateId,
    activeSegmentId,
    setActiveSegmentId,
    activeDimension,
    setActiveDimension,
    playbackTimeSec,
    setPlaybackTimeSec,
    isPlaying,
    setIsPlaying,
    evidenceVisible,
    setEvidenceVisible,
    rubricTab,
    setRubricTab,
    demoFocus,
    demoCaption,
    pauseForUser,
    handleUserInteraction,
    scrollToSegmentOnUserAction,
  }
}
