'use client'

import { ReviewConsolePlayback } from '@/components/recruiter/review-console-playback'
import { ReviewConsoleTranscript } from '@/components/recruiter/review-console-transcript'
import { RubricVerdict } from '@/components/recruiter/rubric-verdict'
import {
  useReviewActions,
  useReviewActiveDimension,
  useReviewData,
} from '@/components/recruiter/review-context'

export function ReviewConsoleBody() {
  const {
    dimensionScores,
    evidenceWithTiming,
    weightedScore,
    hardGateTriggered,
  } = useReviewData()
  const activeDimension = useReviewActiveDimension()
  const { setActiveDimension, jumpToTime } = useReviewActions()

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,420px)]">
      <div className="flex flex-col gap-4">
        <ReviewConsoleTranscript />
        <ReviewConsolePlayback />
      </div>

      <div className="flex flex-col gap-4 xl:sticky xl:top-[calc(var(--review-header-height,5.5rem)+1rem)] xl:max-h-[calc(100dvh-var(--review-header-height,5.5rem)-2rem)] xl:overflow-y-auto">
        <RubricVerdict
          dimensionScores={dimensionScores}
          evidence={evidenceWithTiming}
          weightedScore={weightedScore}
          hardGateTriggered={hardGateTriggered}
          activeDimension={activeDimension}
          onSelectDimension={setActiveDimension}
          onJumpToTime={jumpToTime}
        />
      </div>
    </section>
  )
}
