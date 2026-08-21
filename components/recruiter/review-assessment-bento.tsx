'use client'

import { useMemo, useState } from 'react'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { SummaryList } from '@/components/admin/summary-list'
import { StatusBadge } from '@/components/workspace/status-badge'
import { RubricRadar } from '@/components/recruiter/rubric-radar'
import { cn } from '@/lib/utils'
import {
  getTeachingSimulationGuidance,
  getTeachingSimulationStatusLabel,
  type TeachingSimulationSummary,
} from '@/lib/recruiter/teaching-simulation'
import {
  formatScoreValue,
  resolveOverallScore,
  scoreTextColor,
} from '@/lib/ui/score-format'

type ReviewAssessmentBentoProps = {
  report: {
    summary?: string | null
    transcriptQualityNote?: string | null
    weightedScore?: number | null
    hardGateTriggered?: boolean
    /** Gates that applied at scoring time; absent on pre-migration reports. */
    hardGateDimensions?: string[]
    topStrengths: string[]
    topConcerns: string[]
    dimensionScores: Array<{ dimension: string; score: number }>
    policySnapshot?: {
      targetDurationMinutes: number
      allowsResume: boolean
      maxAttempts: number
      rubricVersion: string
      templateName?: string
      interviewStyleMode?: string
    } | null
  } | null
  teachingSimulation: TeachingSimulationSummary
}

export function ReviewAssessmentBento({
  report,
  teachingSimulation,
}: ReviewAssessmentBentoProps) {
  const [summaryExpanded, setSummaryExpanded] = useState(false)

  const overallScore = useMemo(
    () =>
      report
        ? resolveOverallScore(report.weightedScore, report.dimensionScores)
        : null,
    [report]
  )

  const summary = report?.summary ?? 'No summary generated yet.'
  const summaryTruncated = summary.length > 280 && !summaryExpanded

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <WorkspaceSurface className="p-5 xl:col-span-1">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Score profile
        </p>
        {report?.dimensionScores.length ? (
          <>
            <div className="mt-4 flex items-baseline gap-2">
              <span
                className={cn(
                  'font-mono text-4xl font-semibold tabular-nums',
                  overallScore !== null
                    ? scoreTextColor(overallScore)
                    : 'text-muted-foreground'
                )}
              >
                {formatScoreValue(overallScore)}
              </span>
              <span className="text-sm text-muted-foreground">
                / 5 weighted
              </span>
            </div>
            {report.hardGateTriggered ? (
              <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                Hard gate triggered on a core dimension
              </p>
            ) : null}
            <div className="-mx-2 mt-4">
              <RubricRadar
                dimensionScores={report.dimensionScores}
                hardGateDimensions={report.hardGateDimensions}
              />
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No dimension scores available yet.
          </p>
        )}
      </WorkspaceSurface>

      <WorkspaceSurface className="p-5 md:col-span-1 xl:col-span-1">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Executive summary
        </p>
        {report ? (
          <div className="mt-4">
            <p
              className={cn(
                'text-sm leading-6 text-pretty text-muted-foreground',
                summaryTruncated && 'line-clamp-5'
              )}
            >
              {summary}
            </p>
            {summary.length > 280 ? (
              <button
                type="button"
                onClick={() => setSummaryExpanded((prev) => !prev)}
                className="mt-2 text-sm font-medium text-primary transition-transform duration-200 active:scale-[0.96]"
              >
                {summaryExpanded ? 'Show less' : 'Show more'}
              </button>
            ) : null}
            {report.transcriptQualityNote ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Transcript quality: {report.transcriptQualityNote}
              </p>
            ) : null}
            {report.policySnapshot ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Policy: {report.policySnapshot.targetDurationMinutes} min ·{' '}
                {report.policySnapshot.allowsResume
                  ? 'resume allowed'
                  : 'single-pass'}{' '}
                · {report.policySnapshot.maxAttempts} attempt
                {report.policySnapshot.maxAttempts === 1 ? '' : 's'} · rubric{' '}
                {report.policySnapshot.rubricVersion}
                {report.policySnapshot.templateName
                  ? ` · ${report.policySnapshot.templateName}`
                  : ''}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No assessment report exists yet.
          </p>
        )}
      </WorkspaceSurface>

      <WorkspaceSurface className="p-5 md:col-span-2 xl:col-span-1">
        <div className="flex flex-col gap-4">
          <SummaryList
            label="Top strengths"
            items={report?.topStrengths ?? []}
            emptyLabel="No strengths captured yet."
          />
          <SummaryList
            label="Top concerns"
            items={report?.topConcerns ?? []}
            emptyLabel="No concerns captured yet."
          />
        </div>
      </WorkspaceSurface>

      <WorkspaceSurface className="p-5 md:col-span-2 xl:col-span-1">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Teaching simulation
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge
            status={
              teachingSimulation.completed
                ? 'completed'
                : teachingSimulation.started
                  ? 'in_progress'
                  : 'pending'
            }
            label={getTeachingSimulationStatusLabel(teachingSimulation)}
          />
          <StatusBadge
            status={teachingSimulation.screenShared ? 'live' : 'pending'}
            label={
              teachingSimulation.screenShared
                ? 'Screen share used'
                : 'No screen share'
            }
          />
        </div>
        <p className="mt-4 text-sm leading-6 text-pretty text-muted-foreground">
          {getTeachingSimulationGuidance(teachingSimulation)}
        </p>
      </WorkspaceSurface>
    </section>
  )
}
