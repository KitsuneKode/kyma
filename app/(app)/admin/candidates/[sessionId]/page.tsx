import Link from 'next/link'
import { fetchQuery } from 'convex/nextjs'
import type { ReactNode } from 'react'

import type { Id } from '@/convex/_generated/dataModel'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { RecruiterChat } from '@/components/recruiter/recruiter-chat'
import { RecruiterNotes } from '@/components/recruiter/recruiter-notes'
import { ReviewActions } from '@/components/recruiter/review-actions'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { env } from '@/lib/env'
import {
  formatConfidenceLabel,
  formatDateTime,
  formatDimensionLabel,
  formatRecommendationLabel,
  formatStatusLabel,
} from '@/lib/recruiter/format'

type CandidateReviewPageProps = {
  params: Promise<{
    sessionId: string
  }>
}

export default async function CandidateReviewPage({
  params,
}: CandidateReviewPageProps) {
  const { sessionId } = await params
  const token = await getServerConvexAuthToken()
  const detail = env.NEXT_PUBLIC_CONVEX_URL
    ? await fetchQuery(
        api.recruiter.getCandidateReviewDetail,
        {
          sessionId: sessionId as Id<'interviewSessions'>,
        },
        {
          token: token ?? undefined,
        }
      ).catch(() => null)
    : null

  if (!detail) {
    return (
      <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <section className="rounded-xl border bg-card p-8 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Recruiter Review
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Candidate session not found
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The session id may be invalid, or Convex is not configured in this
            environment.
          </p>
          <div className="mt-6">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/admin/candidates" />}
            >
              Back to candidates
            </Button>
          </div>
        </section>
      </main>
    )
  }

  const teachingSimulation = summarizeTeachingSimulation(detail.events)

  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Candidate Review
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {detail.candidate.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Review the transcript, session behavior, evidence, and current
              recommendation in one place. This is the operational screen the
              product will grow around.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/admin/candidates" />}
            >
              Back to queue
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard
          label="Recommendation"
          value={formatRecommendationLabel(detail.report?.recommendation)}
          detail={`Confidence: ${formatConfidenceLabel(detail.report?.confidence)}`}
        />
        <MetricCard
          label="Report status"
          value={formatStatusLabel(detail.report?.status ?? 'pending')}
          detail={
            detail.report?.generatedAt
              ? `Updated ${formatDateTime(detail.report.generatedAt)}`
              : 'Waiting on assessment pipeline'
          }
        />
        <MetricCard
          label="Candidate turns"
          value={String(detail.transcriptMetrics.candidateTurns)}
          detail={`${detail.transcriptMetrics.candidateWords} candidate words`}
        />
        <MetricCard
          label="Agent turns"
          value={String(detail.transcriptMetrics.agentTurns)}
          detail={`${detail.transcriptMetrics.agentWords} interviewer words`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <InfoCard
            title="Session summary"
            description="High-signal operational facts for this screening."
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="Template" value={detail.template.name} />
              <InfoRow label="Role" value={detail.template.role} />
              <InfoRow
                label="Session state"
                value={formatStatusLabel(detail.session.state)}
              />
              <InfoRow
                label="Invite state"
                value={formatStatusLabel(detail.candidate.inviteStatus)}
              />
              <InfoRow
                label="Started"
                value={formatDateTime(detail.session.startedAt)}
              />
              <InfoRow
                label="Ended"
                value={formatDateTime(detail.session.endedAt)}
              />
            </dl>
          </InfoCard>

          <InfoCard
            title="Teaching simulation"
            description="Signals from the child-persona segment and visual teaching artifacts."
          >
            <dl className="grid gap-4 md:grid-cols-3">
              <InfoRow
                label="Status"
                value={
                  teachingSimulation.completed
                    ? 'Completed'
                    : teachingSimulation.started
                      ? 'Started'
                      : 'Not reached'
                }
              />
              <InfoRow
                label="Screen share"
                value={teachingSimulation.screenShared ? 'Used' : 'Not used'}
              />
              <InfoRow
                label="Started at"
                value={formatOptionalDateTime(teachingSimulation.startedAt)}
              />
            </dl>
            <p className="mt-4 text-sm text-muted-foreground">
              {teachingSimulation.completed
                ? 'The candidate reached the live teaching segment, which is the strongest signal for simplification, patience, and adaptability.'
                : teachingSimulation.started
                  ? 'The teaching simulation began but did not fully complete, so reviewers should inspect the transcript and timeline before trusting the report too strongly.'
                  : 'This session never reached the live teaching segment, so the current report is based mainly on conversational evidence.'}
            </p>
          </InfoCard>

          <InfoCard
            title="Assessment summary"
            description="Structured report output that future pipelines will enrich further."
          >
            {detail.report ? (
              <div className="flex flex-col gap-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <SummaryList
                    label="Top strengths"
                    items={detail.report.topStrengths}
                    emptyLabel="No strengths captured yet."
                  />
                  <SummaryList
                    label="Top concerns"
                    items={detail.report.topConcerns}
                    emptyLabel="No concerns captured yet."
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold">Executive summary</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {detail.report.summary ?? 'No summary generated yet.'}
                  </p>
                  {detail.report.transcriptQualityNote ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Transcript quality note:{' '}
                      {detail.report.transcriptQualityNote}
                    </p>
                  ) : null}
                </div>

                <div>
                  <h3 className="text-sm font-semibold">Dimension scores</h3>
                  {detail.report.dimensionScores.length ? (
                    <div className="mt-4 flex flex-col gap-3">
                      {detail.report.dimensionScores.map((score) => (
                        <div
                          key={score.dimension}
                          className="rounded-lg border px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <p className="font-medium">
                              {formatDimensionLabel(score.dimension)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {score.score.toFixed(1)} / 5
                            </p>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {score.rationale}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Dimension scoring has not been generated yet.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No assessment report exists yet. The session and transcript are
                available, but the evidence/report pipeline still needs to write
                into the recruiter review layer.
              </p>
            )}
          </InfoCard>

          <InfoCard
            title="Evidence"
            description="Transcript-backed reasons behind the recommendation."
          >
            {detail.evidence.length ? (
              <div className="flex flex-col gap-3">
                {detail.evidence.map((item) => (
                  <div key={item.id} className="rounded-lg border px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium">
                        {formatDimensionLabel(item.dimension)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.startedAt
                          ? formatDateTime(item.startedAt)
                          : 'No timestamp'}
                      </p>
                    </div>
                    <blockquote className="mt-3 rounded-lg bg-muted/40 px-4 py-3 text-sm leading-6">
                      {item.snippet}
                    </blockquote>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {item.rationale}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No evidence has been generated yet. This will be populated by
                the transcript-to-report pipeline.
              </p>
            )}
          </InfoCard>

          <InfoCard
            title="Recruiter notes"
            description="Capture human observations alongside the structured report."
          >
            <RecruiterNotes
              sessionId={detail.session.id}
              reportId={detail.report?.id}
              notes={detail.notes}
            />
          </InfoCard>
        </div>

        <aside className="flex flex-col gap-6">
          <InfoCard
            title="Review action"
            description="Record the recruiter decision without leaving this page."
          >
            <ReviewActions
              reportId={detail.report?.id}
              sessionId={detail.session.id}
            />
          </InfoCard>

          <InfoCard
            title="Review timeline"
            description="Session lifecycle and recruiter decisions."
          >
            <div className="flex flex-col gap-3">
              {detail.decisions.length ? (
                detail.decisions.map((decision) => (
                  <div
                    key={decision.id}
                    className="rounded-lg border px-4 py-3"
                  >
                    <p className="font-medium">
                      {formatStatusLabel(decision.decision)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(decision.createdAt)}
                    </p>
                    {decision.rationale ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {decision.rationale}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recruiter decision has been recorded yet.
                </p>
              )}
            </div>
          </InfoCard>

          <InfoCard
            title="Recordings"
            description="LiveKit-owned replay artifacts that later feed recruiter playback."
          >
            <div className="flex flex-col gap-3">
              {detail.recordings.length ? (
                detail.recordings.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="rounded-lg border px-4 py-3"
                  >
                    <p className="font-medium">
                      {formatStatusLabel(artifact.artifactType)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatStatusLabel(artifact.status)}
                    </p>
                    {artifact.location ? (
                      <a
                        href={artifact.location}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block text-sm text-primary underline-offset-4 hover:underline"
                      >
                        Open artifact
                      </a>
                    ) : artifact.manifestLocation ? (
                      <a
                        href={artifact.manifestLocation}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block text-sm text-primary underline-offset-4 hover:underline"
                      >
                        Open manifest
                      </a>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Waiting for storage location.
                      </p>
                    )}
                    {artifact.error ? (
                      <p className="mt-2 text-sm text-destructive">
                        {artifact.error}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recording artifacts have been captured yet.
                </p>
              )}
            </div>
          </InfoCard>

          <InfoCard
            title="Recruiter copilot"
            description="Ask grounded questions about the transcript, evidence, and recommendation."
          >
            <RecruiterChat
              sessionId={detail.session.id}
              reportId={detail.report?.id}
              initialMessages={detail.chatMessages}
            />
          </InfoCard>

          <InfoCard
            title="Session events"
            description="Operational timeline from the room lifecycle."
          >
            <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
              {detail.events.map((event) => (
                <div key={event.id} className="rounded-lg border px-4 py-3">
                  <p className="font-medium">{formatStatusLabel(event.type)}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {event.detail}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateTime(event.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </InfoCard>
        </aside>
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold">Transcript</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This is the durable transcript artifact that later report generation
          and recruiter AI chat will build on.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {detail.transcript.length ? (
            detail.transcript.map((segment) => (
              <div key={segment.id} className="rounded-lg border px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium">
                    {segment.speaker === 'candidate'
                      ? detail.candidate.name
                      : segment.speaker === 'agent'
                        ? 'Interviewer'
                        : 'System'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {segment.status === 'final' ? 'Final' : 'Partial'} ·{' '}
                    {formatDateTime(segment.startedAt)}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {segment.text}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No transcript has been captured yet.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  )
}

function InfoCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-2 text-sm font-medium">{value}</dd>
    </div>
  )
}

function SummaryList({
  label,
  items,
  emptyLabel,
}: {
  label: string
  items: string[]
  emptyLabel: string
}) {
  return (
    <div className="rounded-lg border px-4 py-4">
      <h3 className="text-sm font-semibold">{label}</h3>
      {items.length ? (
        <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  )
}

function summarizeTeachingSimulation(
  events: Array<{
    type: string
    createdAt: string
  }>
) {
  const startedEvent = events.find(
    (event) => event.type === 'teaching-simulation-started'
  )
  const completedEvent = events.find(
    (event) => event.type === 'teaching-simulation-completed'
  )
  const screenShareEvent = events.find(
    (event) => event.type === 'candidate-screen-share-started'
  )

  return {
    started: Boolean(startedEvent),
    completed: Boolean(completedEvent),
    screenShared: Boolean(screenShareEvent),
    startedAt: startedEvent?.createdAt,
  }
}

function formatOptionalDateTime(value?: string) {
  return value ? formatDateTime(value) : 'Not available'
}
