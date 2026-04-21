"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  isPreflightComplete,
  markPreflightStep,
} from "@/lib/interview/preflight";
import { getSessionStateLabel, transitionSession } from "@/lib/interview/session-machine";
import { upsertTranscriptSegment } from "@/lib/interview/transcript";
import { type InterviewSessionSnapshot } from "@/lib/interview/types";

type InterviewWorkspaceProps = {
  initialSnapshot: InterviewSessionSnapshot;
};

export function InterviewWorkspace({ initialSnapshot }: InterviewWorkspaceProps) {
  const [session, setSession] = useState(initialSnapshot);

  const allChecksPassed = useMemo(
    () => isPreflightComplete(session.preflight),
    [session.preflight],
  );

  function passStep(stepKey: (typeof session.preflight)[number]["key"]) {
    setSession((current) => ({
      ...current,
      preflight: markPreflightStep(current.preflight, stepKey, "passed"),
      events: [
        ...current.events,
        {
          type: "preflight-completed",
          detail: `${stepKey} marked as passed locally`,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }

  function startJoin() {
    setSession((current) => ({
      ...current,
      state: transitionSession(current.state, "connecting"),
      events: [
        ...current.events,
        {
          type: "room-token-requested",
          detail: "Candidate requested room credentials.",
          createdAt: new Date().toISOString(),
        },
      ],
    }));

    window.setTimeout(() => {
      setSession((current) => ({
        ...current,
        state: transitionSession(current.state, "live"),
        events: [
          ...current.events,
          {
            type: "participant-joined",
            detail: "Candidate joined the interview room.",
            createdAt: new Date().toISOString(),
          },
        ],
        transcript: upsertTranscriptSegment(current.transcript, {
          id: "agent-greeting",
          speaker: "agent",
          status: "final",
          text: "Welcome. We are ready to begin the interview.",
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
        }),
      }));
    }, 600);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Candidate Workspace
            </p>
            <h1 className="text-2xl font-semibold">{initialSnapshot.templateName}</h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Minimal functional shell for the first reliable voice interview flow.
            </p>
          </div>
          <div className="rounded-full border px-3 py-1 text-xs font-medium">
            {getSessionStateLabel(session.state)}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold">Preflight</h2>
          <div className="space-y-2">
            {session.preflight.map((step) => (
              <div
                key={step.key}
                className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{step.status}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={step.status === "passed"}
                    onClick={() => passStep(step.key)}
                  >
                    Pass
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button disabled={!allChecksPassed || session.state !== "ready"} onClick={startJoin}>
            Join Interview
          </Button>
          <Button
            variant="outline"
            disabled={session.state !== "live"}
            onClick={() =>
              setSession((current) => ({
                ...current,
                state: transitionSession(current.state, "reconnecting"),
                events: [
                  ...current.events,
                  {
                    type: "reconnect-started",
                    detail: "Simulated reconnect sequence started.",
                    createdAt: new Date().toISOString(),
                  },
                ],
              }))
            }
          >
            Simulate Reconnect
          </Button>
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold">Session Timeline</h2>
          <div className="mt-4 space-y-3">
            {session.events.map((event) => (
              <div key={`${event.type}-${event.createdAt}`} className="rounded-lg border px-4 py-3">
                <p className="text-sm font-medium">{event.type}</p>
                <p className="text-xs text-muted-foreground">{event.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold">Transcript</h2>
          <div className="mt-4 space-y-3">
            {session.transcript.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Transcript segments will appear here once the live room is wired.
              </p>
            ) : (
              session.transcript.map((segment) => (
                <div key={segment.id} className="rounded-lg border px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {segment.speaker}
                  </p>
                  <p className="mt-1 text-sm">{segment.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
