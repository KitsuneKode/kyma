import type { CandidateReviewDetail } from '@/components/recruiter/candidate-review-workspace'

export function getPrimaryRecording(detail: CandidateReviewDetail) {
  return detail.recordings.find(
    (recording) =>
      recording.location &&
      recording.status === 'complete' &&
      (recording.artifactType === 'audio' ||
        recording.artifactType === 'composite')
  )
}
