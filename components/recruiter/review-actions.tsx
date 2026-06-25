'use client'

import { startTransition, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { toast } from 'sonner'

import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { StatusBadge } from '@/components/workspace/status-badge'
import { WorkspaceTextarea } from '@/components/workspace/textarea'

import {
  REVIEW_DECISION_LABELS,
  type ReviewDecision,
} from '@/lib/domain/review-decision'

const DECISIONS: Array<{
  value: ReviewDecision
  label: string
  variant: 'default' | 'outline' | 'secondary' | 'destructive'
  shortcut: string
}> = [
  {
    value: 'advance',
    label: REVIEW_DECISION_LABELS.advance,
    variant: 'default',
    shortcut: '1',
  },
  {
    value: 'hold',
    label: REVIEW_DECISION_LABELS.hold,
    variant: 'outline',
    shortcut: '2',
  },
  {
    value: 'manual_review',
    label: REVIEW_DECISION_LABELS.manual_review,
    variant: 'secondary',
    shortcut: '3',
  },
  {
    value: 'reject',
    label: REVIEW_DECISION_LABELS.reject,
    variant: 'destructive',
    shortcut: '4',
  },
]

type ReviewActionsProps = {
  reportId?: string
  sessionId: string
  released?: boolean
  compact?: boolean
}

export function ReviewActions({
  reportId,
  sessionId,
  released = false,
  compact = false,
}: ReviewActionsProps) {
  const router = useRouter()
  const submitReviewDecision = useMutation(
    api.recruiter.reviews.submitReviewDecision
  )
  const releaseReport = useMutation(api.recruiter.reviews.releaseReport)
  const [rationale, setRationale] = useState('')
  const [selectedDecision, setSelectedDecision] =
    useState<ReviewDecision>('advance')
  const [error, setError] = useState<string | null>(null)
  const [releaseError, setReleaseError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isReleasing, setIsReleasing] = useState(false)

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

      const shortcutDecision = DECISIONS.find(
        (decision) => decision.shortcut === event.key
      )
      if (shortcutDecision) {
        event.preventDefault()
        setSelectedDecision(shortcutDecision.value)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  async function handleSubmit() {
    if (!reportId) {
      setError(
        'Wait for the assessment report before recording a reviewer decision.'
      )
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await submitReviewDecision({
        reportId: reportId as Id<'assessmentReports'>,
        sessionId: sessionId as Id<'interviewSessions'>,
        decision: selectedDecision,
        rationale: rationale.trim() || undefined,
      })

      setRationale('')
      toast.success('Review decision saved')
      startTransition(() => {
        router.refresh()
      })
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Unable to save the recruiter decision.'
      setError(message)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRelease() {
    if (!reportId) {
      setReleaseError('Wait for the assessment report before releasing.')
      return
    }

    setIsReleasing(true)
    setReleaseError(null)

    try {
      await releaseReport({
        reportId: reportId as Id<'assessmentReports'>,
        sessionId: sessionId as Id<'interviewSessions'>,
      })
      toast.success('Report released to candidate')
      startTransition(() => {
        router.refresh()
      })
    } catch (releaseFailure) {
      const message =
        releaseFailure instanceof Error
          ? releaseFailure.message
          : 'Unable to release the report to the candidate.'
      setReleaseError(message)
      toast.error(message)
    } finally {
      setIsReleasing(false)
    }
  }

  return (
    <div
      className={
        compact ? 'space-y-3' : 'space-y-4 rounded-lg bg-muted/20 px-4 py-4'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Review action</h3>
          {!compact ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Record a reviewer decision for this report. Shortcuts: 1–4 to pick
              a decision.
            </p>
          ) : null}
        </div>
        <StatusBadge
          status={released ? 'released' : 'pending_release'}
          label={released ? 'Released to candidate' : 'Not released'}
        />
      </div>

      <ButtonGroup className="mt-4 flex-wrap gap-2">
        {DECISIONS.map((decision) => (
          <Button
            key={decision.value}
            type="button"
            variant={
              selectedDecision === decision.value ? decision.variant : 'outline'
            }
            onClick={() => setSelectedDecision(decision.value)}
          >
            <span className="mr-1.5 font-mono text-[10px] opacity-60">
              {decision.shortcut}
            </span>
            {decision.label}
          </Button>
        ))}
      </ButtonGroup>

      <label className="block text-sm font-medium" htmlFor="review-rationale">
        Reviewer note
      </label>
      <WorkspaceTextarea
        id="review-rationale"
        value={rationale}
        onChange={(event) => setRationale(event.target.value)}
        placeholder="Add the reason behind this recruiter action."
      />

      {error ? (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Current choice: {selectedDecision.replaceAll('_', ' ')}.
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {!released && reportId ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleRelease}
            disabled={isReleasing || isSaving}
          >
            {isReleasing ? 'Releasing…' : 'Release to candidate'}
          </Button>
        ) : null}
        <Button type="button" onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save review action'}
        </Button>
      </div>

      {releaseError ? (
        <p className="text-sm text-destructive">{releaseError}</p>
      ) : null}
    </div>
  )
}
