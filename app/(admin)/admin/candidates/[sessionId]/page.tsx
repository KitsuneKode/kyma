import Link from 'next/link'
import { fetchQuery } from 'convex/nextjs'
import type { Id } from '@/convex/_generated/dataModel'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { RecruiterChat } from '@/components/recruiter/recruiter-chat'
import { RecruiterNotes } from '@/components/recruiter/recruiter-notes'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { DecisionBar } from '@/components/recruiter/decision-bar'
import { AdminStatePanel } from '@/components/admin/admin-state-panel'
import { CollapsibleInfoSection } from '@/components/admin/collapsible-info-section'
import { InfoCard } from '@/components/admin/info-card'
import { InfoRow } from '@/components/admin/info-row'
import { SummaryList } from '@/components/admin/summary-list'
import { clientEnv } from '@/lib/env/client'
import { formatDateTime, formatStatusLabel } from '@/lib/recruiter/format'
import { ReviewConsole } from '@/components/recruiter/review-console'
import { RenderErrorBoundary } from '@/components/errors/render-error-boundary'

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
  const detail = clientEnv.NEXT_PUBLIC_CONVEX_URL
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
        <AdminStatePanel
          eyebrow="Recruiter review"
          title="Candidate session not found"
          description="The session id may be invalid, or Convex is not configured in this environment."
          action={
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/admin/candidates" />}
            >
              Back to candidates
            </Button>
          }
        />
      </main>
    )
  }

  const teachingSimulation = summarizeTeachingSimulation(detail.events)

  return (
    <div className="flex w-full flex-col gap-6">
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
        backHref="/admin/candidates"
      />

      <RenderErrorBoundary title="Review console">
        <ReviewConsole
          candidateName={detail.candidate.name}
          transcript={detail.transcript}
          evidence={detail.evidence}
          dimensionScores={detail.report?.dimensionScores ?? []}
          audioUrl={
            detail.recordings.find(
              (r) =>
                r.location &&
                (r.artifactType === 'audio' || r.artifactType === 'composite')
            )?.location
          }
          recordingStartTime={
            detail.recordings.find(
              (r) =>
                r.location &&
                (r.artifactType === 'audio' || r.artifactType === 'composite')
            )?.startedAt
          }
        />
      </RenderErrorBoundary>

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
        </CollapsibleInfoSection>

        <CollapsibleInfoSection
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
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No assessment report exists yet. The session and transcript are
              available, but the evidence/report pipeline still needs to write
              into the recruiter review layer.
            </p>
          )}
        </CollapsibleInfoSection>

        <CollapsibleInfoSection
          title="Recordings"
          description="LiveKit-owned replay artifacts."
        >
          <div className="flex flex-col gap-3">
            {detail.recordings.length ? (
              detail.recordings.map((artifact) => (
                <div key={artifact.id} className="rounded-lg border px-4 py-3">
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

        <CollapsibleInfoSection
          title="Review timeline"
          description="Recruiter decisions for this session."
        >
          <div className="flex flex-col gap-3">
            {detail.decisions.length ? (
              detail.decisions.map((decision) => (
                <div key={decision.id} className="rounded-lg border px-4 py-3">
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
        </CollapsibleInfoSection>

        <CollapsibleInfoSection
          title="Recruiter copilot"
          description="Ask grounded questions about the transcript, evidence, and recommendation."
        >
          <RenderErrorBoundary title="Recruiter chat">
            <RecruiterChat
              sessionId={detail.session.id}
              reportId={detail.report?.id}
              initialMessages={detail.chatMessages}
            />
          </RenderErrorBoundary>
        </CollapsibleInfoSection>
      </div>
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
