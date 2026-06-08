'use client'

import { useState } from 'react'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { InfoRow } from '@/components/admin/info-row'
import { RecruiterNotes } from '@/components/recruiter/recruiter-notes'
import { formatDateTime, formatStatusLabel } from '@/lib/recruiter/format'
import {
  formatOptionalDateTime,
  getTeachingSimulationStatusLabel,
  type TeachingSimulationSummary,
} from '@/lib/recruiter/teaching-simulation'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'notes', label: 'Notes' },
  { id: 'session', label: 'Session' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'recordings', label: 'Recordings' },
  { id: 'decisions', label: 'Decisions' },
] as const

type TabId = (typeof TABS)[number]['id']

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
}: ReviewDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('notes')

  return (
    <WorkspaceSurface className="p-0">
      <div
        role="tablist"
        aria-label="Review details"
        className="flex flex-wrap gap-1 border-b border-border/50 px-4 pt-4 pb-0"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`review-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`review-panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-t-xl px-3.5 py-2 text-sm font-medium transition-[color,background-color] duration-200 active:scale-[0.96]',
              activeTab === tab.id
                ? 'bg-muted/50 text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {activeTab === 'notes' ? (
          <div
            role="tabpanel"
            id="review-panel-notes"
            aria-labelledby="review-tab-notes"
          >
            <RecruiterNotes
              sessionId={sessionId}
              reportId={reportId}
              notes={notes}
            />
          </div>
        ) : null}

        {activeTab === 'session' ? (
          <div
            role="tabpanel"
            id="review-panel-session"
            aria-labelledby="review-tab-session"
          >
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
          </div>
        ) : null}

        {activeTab === 'timeline' ? (
          <div
            role="tabpanel"
            id="review-panel-timeline"
            aria-labelledby="review-tab-timeline"
          >
            <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl bg-muted/35 px-4 py-3 ring-1 ring-border/50"
                >
                  <p className="font-medium">{formatStatusLabel(event.type)}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {event.detail}
                  </p>
                  <p className="mt-2 font-mono text-xs text-muted-foreground tabular-nums">
                    {formatDateTime(event.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === 'recordings' ? (
          <div
            role="tabpanel"
            id="review-panel-recordings"
            aria-labelledby="review-tab-recordings"
          >
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
          </div>
        ) : null}

        {activeTab === 'decisions' ? (
          <div
            role="tabpanel"
            id="review-panel-decisions"
            aria-labelledby="review-tab-decisions"
          >
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
          </div>
        ) : null}
      </div>
    </WorkspaceSurface>
  )
}
