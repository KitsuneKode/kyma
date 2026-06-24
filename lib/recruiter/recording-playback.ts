import type { CandidateReviewDetail } from '@/lib/recruiter/types'

export function getPrimaryRecording(detail: CandidateReviewDetail) {
  return detail.recordings.find(
    (recording) =>
      recording.location &&
      recording.status === 'complete' &&
      (recording.artifactType === 'audio' ||
        recording.artifactType === 'composite')
  )
}
