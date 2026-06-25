'use client'

import { useEffect } from 'react'

import {
  useReviewActions,
  useReviewActiveDimension,
  useReviewData,
  useReviewStore,
} from '@/components/recruiter/review-context'

export function ReviewKeyboardShortcuts() {
  const { evidenceWithTiming } = useReviewData()
  const activeDimension = useReviewActiveDimension()
  const { jumpToTime, setFocusedEvidenceIndex } = useReviewActions()
  const focusedEvidenceIndex = useReviewStore(
    (state) => state.focusedEvidenceIndex
  )

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      if (event.key !== 'j' && event.key !== 'k') {
        return
      }

      const pool = activeDimension
        ? evidenceWithTiming.filter(
            (item) => item.dimension === activeDimension
          )
        : evidenceWithTiming

      if (!pool.length) {
        return
      }

      event.preventDefault()

      const delta = event.key === 'j' ? 1 : -1
      const nextIndex = Math.min(
        pool.length - 1,
        Math.max(0, focusedEvidenceIndex + delta)
      )
      const nextEvidence = pool[nextIndex]
      if (!nextEvidence) {
        return
      }

      setFocusedEvidenceIndex(nextIndex)
      if (nextEvidence.startedAtSec !== undefined) {
        jumpToTime(nextEvidence.startedAtSec)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    activeDimension,
    evidenceWithTiming,
    focusedEvidenceIndex,
    jumpToTime,
    setFocusedEvidenceIndex,
  ])

  return null
}
