import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import { WorkspaceSurface } from '@/components/workspace/surface'
import {
  buildCandidateProcessingSteps,
  formatCandidateTimelineLabel,
} from '@/lib/candidate/result-copy'
import {
  formatDateTime,
  formatDimensionLabel,
  formatRecommendationLabel,
} from '@/lib/recruiter/format'
import { formatScoreValue, scoreColor } from '@/lib/ui/score-format'
import { cn } from '@/lib/utils'

export type CandidateInterviewResult = {
  sessionId: string
  state: string
  resultState: 'processing' | 'under_review' | 'released' | 'unavailable'
  reportStatus?: string | null
  templateName?: string | null
  startedAt?: string | null
  endedAt?: string | null
  timeline: Array<{
    id: string
    type: string
    detail: string
    createdAt: string
  }>
  report: {
    status: string
    recommendation?: string | null
    confidence?: string | null
    summary?: string | null
    weightedScore?: number | null
    generatedAt?: string | null
    rubricSummary?: Array<{
      dimension: string
      score: number
      band: string
    }> | null
    strengths?: string[]
    growthAreas?: string[]
  } | null
}

export function InterviewResultContent({
  result,
}: {
  result: CandidateInterviewResult
}) {
  const processingSteps = buildCandidateProcessingSteps({
    resultState: result.resultState,
    reportStatus: result.reportStatus,
  })
  const completedSteps = processingSteps.filter(
    (step) => step.status === 'complete'
  ).length
  const progressValue = (completedSteps / processingSteps.length) * 100

  return (
    <section className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Interview outcome"
        title={result.templateName ?? 'Interview result'}
        description="Review your released outcome or current processing status."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link href="/candidate/interviews" />}
          >
            Back to interviews
          </Button>
        }
      />

      {result.resultState === 'processing' ? (
        <WorkspaceSurface className="space-y-5 p-6">
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Processing your interview
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your session is being assessed. This usually takes a few minutes.
              You can leave this page and return later.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="font-mono tabular-nums">
                {completedSteps}/{processingSteps.length} steps
              </span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>
          <ProcessingTimeline steps={processingSteps} />
        </WorkspaceSurface>
      ) : null}

      {result.resultState === 'under_review' ? (
        <WorkspaceSurface className="space-y-5 p-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Under recruiter review
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your assessment is complete and waiting for a recruiter to verify
              the outcome. You will see the final result here once it is
              released.
            </p>
          </div>
          <ProcessingTimeline steps={processingSteps} />
        </WorkspaceSurface>
      ) : null}

      {result.resultState === 'released' && result.report ? (
        <div className="space-y-4">
          <WorkspaceSurface className="p-6">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Outcome
            </p>
            <p className="mt-2 text-lg font-semibold">
              {formatRecommendationLabel(result.report.recommendation)}
            </p>
            {typeof result.report.weightedScore === 'number' ? (
              <p
                className={cn(
                  'mt-3 inline-flex rounded-full px-3 py-1 text-sm font-medium tabular-nums',
                  scoreColor(result.report.weightedScore)
                )}
              >
                Overall score {formatScoreValue(result.report.weightedScore)} /
                5
              </p>
            ) : null}
            {result.report.summary ? (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {result.report.summary}
              </p>
            ) : null}
            {result.report.generatedAt ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Report generated {formatDateTime(result.report.generatedAt)}
              </p>
            ) : null}
          </WorkspaceSurface>

          {result.report.rubricSummary?.length ? (
            <WorkspaceSurface className="p-6">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Skill profile
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                A candidate-safe summary of how you performed across interview
                dimensions.
              </p>
              <ul className="mt-4 space-y-2">
                {result.report.rubricSummary.map((item) => (
                  <li
                    key={item.dimension}
                    className="flex items-center justify-between gap-4 rounded-xl bg-muted/20 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">
                      {formatDimensionLabel(item.dimension)}
                    </span>
                    <span className="text-muted-foreground">
                      {formatScoreValue(item.score)} · {item.band}
                    </span>
                  </li>
                ))}
              </ul>
            </WorkspaceSurface>
          ) : null}

          {result.report.strengths?.length ? (
            <WorkspaceSurface className="p-6">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Strengths
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {result.report.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </WorkspaceSurface>
          ) : null}

          {result.report.growthAreas?.length ? (
            <WorkspaceSurface className="p-6">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Growth areas
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {result.report.growthAreas.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </WorkspaceSurface>
          ) : null}
        </div>
      ) : null}

      {result.resultState === 'unavailable' ? (
        <WorkspaceSurface className="p-6">
          <p className="text-sm text-muted-foreground">
            No result is available for this interview yet.
          </p>
        </WorkspaceSurface>
      ) : null}

      {result.timeline.length > 0 ? (
        <WorkspaceSurface className="p-6">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Session timeline
          </p>
          <ul className="mt-4 space-y-3">
            {result.timeline.map((event) => (
              <li
                key={event.id}
                className="flex items-start justify-between gap-4 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {formatCandidateTimelineLabel(event.type)}
                  </p>
                  {event.detail ? (
                    <p className="mt-0.5 text-muted-foreground">
                      {event.detail}
                    </p>
                  ) : null}
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(event.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        </WorkspaceSurface>
      ) : null}
    </section>
  )
}

function ProcessingTimeline({
  steps,
}: {
  steps: ReturnType<typeof buildCandidateProcessingSteps>
}) {
  return (
    <ol className="space-y-3">
      {steps.map((step) => (
        <li
          key={step.id}
          className={cn(
            'rounded-xl border px-4 py-3',
            step.status === 'active'
              ? 'border-amber-500/30 bg-amber-500/5'
              : 'border-border/50 bg-muted/10'
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{step.label}</p>
            <span className="text-xs text-muted-foreground capitalize">
              {step.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {step.description}
          </p>
        </li>
      ))}
    </ol>
  )
}
