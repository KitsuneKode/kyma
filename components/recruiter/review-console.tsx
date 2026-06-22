'use client'

import { ReviewProvider } from '@/components/recruiter/review-context'
import { ReviewConsolePlayback } from '@/components/recruiter/review-console-playback'
import { ReviewConsoleTranscript } from '@/components/recruiter/review-console-transcript'
import { RubricVerdict } from '@/components/recruiter/rubric-verdict'
import { useReviewContext } from '@/components/recruiter/review-context'
import type { CandidateReviewDetail } from '@/components/recruiter/candidate-review-workspace'

type ReviewConsoleProps = {
  candidateName: string
  transcript: CandidateReviewDetail['transcript']
  evidence: CandidateReviewDetail['evidence']
  dimensionScores: NonNullable<
    CandidateReviewDetail['report']
  >['dimensionScores']
  audioUrl?: string
  recordingStartTime?: string
}

function ReviewConsoleBody() {
  const { dimensionScores, evidenceWithTiming, focus, playback } =
    useReviewContext()
  const { activeDimension, setActiveDimension } = focus
  const { jumpToTime } = playback

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
          activeDimension={activeDimension}
          onSelectDimension={setActiveDimension}
          onJumpToTime={jumpToTime}
        />
      </div>
    </section>
  )
}

export function ReviewConsole(props: ReviewConsoleProps) {
  return (
    <ReviewProvider {...props}>
      <ReviewConsoleBody />
    </ReviewProvider>
  )
}
