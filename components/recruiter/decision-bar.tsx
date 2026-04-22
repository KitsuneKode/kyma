'use client'

import { ReviewActions } from '@/components/recruiter/review-actions'
import {
  formatConfidenceLabel,
  formatRecommendationLabel,
} from '@/lib/recruiter/format'

export function DecisionBar({
  recommendation,
  confidence,
  reportId,
  sessionId,
}: {
  recommendation?: string | null
  confidence?: string | null
  reportId?: string
  sessionId: string
}) {
  return (
    <section className="sticky top-0 z-10 rounded-xl bg-card p-4 shadow-sm">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_200px_minmax(0,1fr)] xl:items-center">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Recommendation
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-balance">
            {formatRecommendationLabel(recommendation)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Confidence
          </p>
          <p className="mt-1 text-sm font-medium">
            {formatConfidenceLabel(confidence)}
          </p>
        </div>
        <ReviewActions reportId={reportId} sessionId={sessionId} compact />
      </div>
    </section>
  )
}
