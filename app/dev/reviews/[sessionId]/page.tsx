import { fetchQuery } from 'convex/nextjs'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { AdminStatePanel } from '@/components/admin/admin-state-panel'
import { CollapsibleInfoSection } from '@/components/admin/collapsible-info-section'
import { InfoCard } from '@/components/admin/info-card'
import { InfoRow } from '@/components/admin/info-row'
import { SummaryList } from '@/components/admin/summary-list'
import { RenderErrorBoundary } from '@/components/errors/render-error-boundary'
import { DecisionBar } from '@/components/recruiter/decision-bar'
import { ReviewConsole } from '@/components/recruiter/review-console'
import { clientEnv } from '@/lib/env/client'
import { serverEnv } from '@/lib/env/server'
import { formatDateTime, formatStatusLabel } from '@/lib/recruiter/format'

type DevReviewPageProps = {
  params: Promise<{ sessionId: string }>
}

export const metadata = {
  title: 'Dev review preview',
  description:
    'Local-only recruiter review preview for seeded interview sessions.',
}

export default async function DevReviewPage({ params }: DevReviewPageProps) {
  await connection()

  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const { sessionId } = await params
  const detail = clientEnv.NEXT_PUBLIC_CONVEX_URL
    ? await fetchQuery(api.recruiter.getCandidateReviewDetail, {
        sessionId: sessionId as Id<'interviewSessions'>,
        processingKey: serverEnv.KYMA_PROCESSING_WRITE_KEY ?? '__dev_preview__',
      }).catch(() => null)
    : null

  if (!detail) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <AdminStatePanel
          eyebrow="Development preview"
          title="Seeded review not found"
          description="Run bun run db:seed:dev and open one of the returned sampleReviewSessionIds."
        />
      </main>
    )
  }

  const teachingSimulation = summarizeTeachingSimulation(detail.events)
  const primaryRecording = detail.recordings.find(
    (recording) =>
      recording.location &&
      (recording.artifactType === 'audio' ||
        recording.artifactType === 'composite')
  )

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-7xl flex-col gap-6 bg-background px-6 py-8">
      <AdminStatePanel
        eyebrow="Development preview"
        title="Seeded recruiter review"
        description="Read-only local view for validating loaded review data without a Clerk session. Production uses the protected recruiter route."
      />

      <DecisionBar
        candidateName={detail.candidate.name}
        recommendation={detail.report?.recommendation}
        confidence={detail.report?.confidence}
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
        backHref="/recruiter/candidates"
        readOnly
      />

      <RenderErrorBoundary title="Review console">
        <ReviewConsole
          candidateName={detail.candidate.name}
          transcript={detail.transcript}
          evidence={detail.evidence}
          dimensionScores={detail.report?.dimensionScores ?? []}
          audioUrl={primaryRecording?.location}
          recordingStartTime={primaryRecording?.startedAt}
        />
      </RenderErrorBoundary>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-3">
          <CollapsibleInfoSection
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
          </CollapsibleInfoSection>

          <CollapsibleInfoSection
            title="Assessment summary"
            description="Structured report output with transcript-backed evidence."
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
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No assessment report exists yet.
              </p>
            )}
          </CollapsibleInfoSection>

          <CollapsibleInfoSection
            title="Session events"
            description="Operational timeline from the room lifecycle."
          >
            <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
              {detail.events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl bg-muted/35 px-4 py-3 ring-1 ring-border/50"
                >
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
          </CollapsibleInfoSection>
        </div>

        <aside className="flex flex-col gap-6">
          <InfoCard
            title="Teaching simulation"
            description="Child-persona and screen-share signals."
          >
            <dl className="grid gap-4">
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
          </InfoCard>

          <InfoCard title="Recordings" description="LiveKit replay artifacts.">
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
                    <p className="mt-2 text-xs break-all text-muted-foreground">
                      {artifact.location ??
                        artifact.manifestLocation ??
                        'Waiting for storage location.'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recording artifacts have been captured yet.
                </p>
              )}
            </div>
          </InfoCard>

          <InfoCard title="Review timeline" description="Human decisions.">
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
        </aside>
      </div>
    </main>
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
