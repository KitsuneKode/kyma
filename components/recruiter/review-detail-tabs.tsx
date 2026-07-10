'use client'

import { WorkspaceSurface } from '@/components/workspace/surface'
import { InfoRow } from '@/components/admin/info-row'
import { RecruiterNotes } from '@/components/recruiter/recruiter-notes'
import { ReviewTimelinePanel } from '@/components/recruiter/review-timeline-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDateTime, formatStatusLabel } from '@/lib/recruiter/format'
import {
  formatOptionalDateTime,
  getTeachingSimulationStatusLabel,
  type TeachingSimulationSummary,
} from '@/lib/recruiter/teaching-simulation'

type ReviewDetailTabsProps = {
  sessionId: string
  reportId?: string
  notes: Array<{
    id: string
    body: string
    authorId?: string
    createdAt: string
  }>
  template: { name: string; role: string }
  session: {
    state: string
    startedAt?: string | null
    endedAt?: string | null
  }
  candidate: { inviteStatus: string }
  events: Array<{
    id: string
    type: string
    detail: string
    createdAt: string
  }>
  recordings: Array<{
    id: string
    artifactType: string
    status: string
    location?: string | null
    manifestLocation?: string | null
    error?: string | null
  }>
  decisions: Array<{
    id: string
    decision: string
    rationale?: string | null
    createdAt: string
  }>
  teachingSimulation: TeachingSimulationSummary
  policySnapshot?: {
    targetDurationMinutes: number
    allowsResume: boolean
    maxAttempts: number
    rubricVersion: string
    interviewStyleMode?: 'standard' | 'intensive' | null
    templateName?: string | null
  } | null
}

function formatStyleMode(mode?: string | null) {
  if (mode === 'intensive') return 'Intensive'
  if (mode === 'standard') return 'Standard'
  return '—'
}

export function ReviewDetailTabs({
  sessionId,
  reportId,
  notes,
  template,
  session,
  candidate,
  events,
  recordings,
  decisions,
  teachingSimulation,
  policySnapshot,
}: ReviewDetailTabsProps) {
  return (
    <WorkspaceSurface className="p-0">
      <Tabs defaultValue="notes" className="gap-0">
        <TabsList
          variant="line"
          className="h-auto w-full justify-start rounded-none border-b border-border/50 bg-transparent px-4 pt-4"
        >
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="session">Session</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="recordings">Recordings</TabsTrigger>
          <TabsTrigger value="decisions">Decisions</TabsTrigger>
        </TabsList>

        <div className="p-5">
          <TabsContent value="notes">
            <RecruiterNotes
              sessionId={sessionId}
              reportId={reportId}
              notes={notes}
            />
          </TabsContent>

          <TabsContent value="session">
            <dl className="grid gap-4 sm:grid-cols-2">
              <InfoRow label="Template" value={template.name} />
              <InfoRow label="Role" value={template.role} />
              <InfoRow
                label="Session state"
                value={formatStatusLabel(session.state)}
              />
              <InfoRow
                label="Invite state"
                value={formatStatusLabel(candidate.inviteStatus)}
              />
              <InfoRow
                label="Started"
                value={formatDateTime(session.startedAt)}
              />
              <InfoRow label="Ended" value={formatDateTime(session.endedAt)} />
              <InfoRow
                label="Teaching simulation"
                value={getTeachingSimulationStatusLabel(teachingSimulation)}
              />
              <InfoRow
                label="Screen share"
                value={teachingSimulation.screenShared ? 'Used' : 'Not used'}
              />
              <InfoRow
                label="Teaching started"
                value={formatOptionalDateTime(teachingSimulation.startedAt)}
              />
            </dl>
            {policySnapshot ? (
              <div className="mt-6 border-t border-border/50 pt-5">
                <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  Screening policy
                </p>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <InfoRow
                    label="Target duration"
                    value={`${policySnapshot.targetDurationMinutes} min`}
                  />
                  <InfoRow
                    label="Max attempts"
                    value={String(policySnapshot.maxAttempts)}
                  />
                  <InfoRow
                    label="Resume"
                    value={
                      policySnapshot.allowsResume
                        ? 'Allowed'
                        : 'Single-pass only'
                    }
                  />
                  <InfoRow
                    label="Rubric version"
                    value={policySnapshot.rubricVersion}
                  />
                  <InfoRow
                    label="Interview style"
                    value={formatStyleMode(policySnapshot.interviewStyleMode)}
                  />
                  {policySnapshot.templateName ? (
                    <InfoRow
                      label="Policy template"
                      value={policySnapshot.templateName}
                    />
                  ) : null}
                </dl>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="timeline">
            <ReviewTimelinePanel
              events={events}
              sessionStartAt={session.startedAt}
            />
          </TabsContent>

          <TabsContent value="recordings">
            <div className="flex flex-col gap-3">
              {recordings.length ? (
                recordings.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="rounded-2xl bg-muted/35 px-4 py-3 ring-1 ring-border/50"
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
                        className="mt-2 block text-sm text-primary underline-offset-4 transition-transform duration-200 hover:underline active:scale-[0.98]"
                      >
                        Open artifact
                      </a>
                    ) : artifact.manifestLocation ? (
                      <a
                        href={artifact.manifestLocation}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block text-sm text-primary underline-offset-4 transition-transform duration-200 hover:underline active:scale-[0.98]"
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
          </TabsContent>

          <TabsContent value="decisions">
            <div className="flex flex-col gap-3">
              {decisions.length ? (
                decisions.map((decision) => (
                  <div
                    key={decision.id}
                    className="rounded-2xl bg-muted/35 px-4 py-3 ring-1 ring-border/50"
                  >
                    <p className="font-medium">
                      {formatStatusLabel(decision.decision)}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
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
          </TabsContent>
        </div>
      </Tabs>
    </WorkspaceSurface>
  )
}
