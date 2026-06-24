'use client'

import type { FunctionReturnType } from 'convex/server'
import { api } from '@/convex/_generated/api'
import { RenderErrorBoundary } from '@/components/errors/render-error-boundary'
import { ReviewCommandHeader } from '@/components/recruiter/decision-bar'
import { ReviewConsole } from '@/components/recruiter/review-console'
import { ReviewAssessmentBento } from '@/components/recruiter/review-assessment-bento'
import { ReviewDetailTabs } from '@/components/recruiter/review-detail-tabs'
import { VideoEvidencePanel } from '@/components/recruiter/video-evidence-panel'
import { formatStatusLabel } from '@/lib/recruiter/format'
import { getPrimaryRecording } from '@/lib/recruiter/recording-playback'
import { summarizeTeachingSimulation } from '@/lib/recruiter/teaching-simulation'
import type { CandidateReviewDetail } from '@/lib/recruiter/types'

export type { CandidateReviewDetail }

type CandidateReviewWorkspaceProps = {
  detail: CandidateReviewDetail
  readOnly?: boolean
  backHref?: string
  audioPlaybackUrl?: string | null
  visualObservations?: FunctionReturnType<
    typeof api.visualObservations.listForSession
  >
}

export function CandidateReviewWorkspace({
  detail,
  readOnly = false,
  backHref = '/recruiter/candidates',
  audioPlaybackUrl,
  visualObservations,
}: CandidateReviewWorkspaceProps) {
  const teachingSimulation = summarizeTeachingSimulation(detail.events)
  const primaryRecording = getPrimaryRecording(detail)
  const resolvedAudioUrl =
    audioPlaybackUrl ?? primaryRecording?.location ?? undefined

  return (
    <div className="flex w-full flex-col gap-8">
      <ReviewCommandHeader
        candidateName={detail.candidate.name}
        templateName={detail.template.name}
        templateRole={detail.template.role}
        recommendation={detail.report?.recommendation}
        confidence={detail.report?.confidence}
        reportStatus={detail.report?.status ?? 'pending'}
        sessionState={detail.session.state}
        reportId={detail.report?.id}
        sessionId={detail.session.id}
        metrics={[
          {
            label: 'Candidate turns',
            value: String(detail.transcriptMetrics.candidateTurns),
          },
          {
            label: 'Agent turns',
            value: String(detail.transcriptMetrics.agentTurns),
          },
          {
            label: 'Report',
            value: formatStatusLabel(detail.report?.status ?? 'pending'),
          },
        ]}
        backHref={backHref}
        readOnly={readOnly}
        released={detail.report?.released ?? false}
        startedAt={detail.session.startedAt}
        endedAt={detail.session.endedAt}
        hardGateTriggered={detail.report?.hardGateTriggered ?? false}
        scoringSource={detail.report?.scoringSource}
        scoringModelId={detail.report?.scoringModelId}
      />

      <RenderErrorBoundary title="Review console">
        <ReviewConsole
          candidateName={detail.candidate.name}
          transcript={detail.transcript}
          evidence={detail.evidence}
          dimensionScores={detail.report?.dimensionScores ?? []}
          weightedScore={detail.report?.weightedScore}
          hardGateTriggered={detail.report?.hardGateTriggered ?? false}
          audioUrl={resolvedAudioUrl}
          recordingStartTime={primaryRecording?.startedAt}
        />
      </RenderErrorBoundary>

      <ReviewAssessmentBento
        report={detail.report}
        teachingSimulation={teachingSimulation}
      />

      <RenderErrorBoundary title="Video evidence">
        <VideoEvidencePanel
          sessionId={detail.session.id}
          initialObservations={visualObservations}
        />
      </RenderErrorBoundary>

      <ReviewDetailTabs
        sessionId={detail.session.id}
        reportId={detail.report?.id}
        notes={detail.notes}
        template={detail.template}
        session={detail.session}
        candidate={detail.candidate}
        events={detail.events}
        recordings={detail.recordings}
        decisions={detail.decisions}
        teachingSimulation={teachingSimulation}
      />
    </div>
  )
}
