'use client'

import { startTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'

import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { cn } from '@/lib/utils'

type ReviewDecision = 'advance' | 'reject' | 'manual_review' | 'hold'

const DECISIONS: Array<{
  value: ReviewDecision
  label: string
  variant: 'default' | 'outline' | 'secondary' | 'destructive'
}> = [
  { value: 'advance', label: 'Advance', variant: 'default' },
  { value: 'hold', label: 'Hold', variant: 'outline' },
  { value: 'manual_review', label: 'Manual review', variant: 'secondary' },
  { value: 'reject', label: 'Reject', variant: 'destructive' },
]

type ReviewActionsProps = {
  reportId?: string
  sessionId: string
  compact?: boolean
}

export function ReviewActions({
  reportId,
  sessionId,
  compact = false,
}: ReviewActionsProps) {
  const router = useRouter()
  const submitReviewDecision = useMutation(api.recruiter.submitReviewDecision)
  const [rationale, setRationale] = useState('')
  const [selectedDecision, setSelectedDecision] =
    useState<ReviewDecision>('advance')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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
      startTransition(() => {
        router.refresh()
      })
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to save the recruiter decision.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className={
        compact ? 'space-y-3' : 'space-y-4 rounded-lg bg-muted/20 px-4 py-4'
      }
    >
      <div>
        <h3 className="text-sm font-semibold">Review action</h3>
        {!compact ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Record a reviewer decision for this report.
          </p>
        ) : null}
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
            {decision.label}
          </Button>
        ))}
      </ButtonGroup>

      <label className="block text-sm font-medium" htmlFor="review-rationale">
        Reviewer note
      </label>
      <textarea
        id="review-rationale"
        value={rationale}
        onChange={(event) => setRationale(event.target.value)}
        placeholder="Add the reason behind this recruiter action."
        className={cn(
          'min-h-24 w-full rounded-lg border bg-background px-3 py-2 text-sm transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
        )}
      />

      {error ? (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Current choice: {selectedDecision.replaceAll('_', ' ')}.
        </p>
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={handleSubmit} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save review action'}
        </Button>
      </div>
    </div>
  )
}
