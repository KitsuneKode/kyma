"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { Room, RoomEvent } from "livekit-client";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  isPreflightComplete,
  markPreflightStep,
} from "@/lib/interview/preflight";
import { getSessionStateLabel, transitionSession } from "@/lib/interview/session-machine";
import { upsertTranscriptSegment as mergeTranscriptSegment } from "@/lib/interview/transcript";
import { type InterviewSessionSnapshot } from "@/lib/interview/types";

type InterviewWorkspaceProps = {
  initialSnapshot: InterviewSessionSnapshot;
};

export function InterviewWorkspace({ initialSnapshot }: InterviewWorkspaceProps) {
  const [session, setSession] = useState(initialSnapshot);
  const [participantName, setParticipantName] = useState("Demo Candidate");
  const [roomName, setRoomName] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const appendSessionEvent = useMutation(api.interviews.appendSessionEvent);
  const persistTranscriptSegment = useMutation(api.interviews.upsertTranscriptSegment);

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

  async function persistSessionEvent(type: string, detail: string, state?: InterviewSessionSnapshot["state"]) {
    if (!sessionIdRef.current) {
      return;
    }

    await appendSessionEvent({
      sessionId: sessionIdRef.current as never,
      type,
      detail,
      state,
    }).catch(() => null);
  }

  async function startJoin() {
    setConnectionError(null);
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
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const response = await fetch("/api/interviews/bootstrap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inviteToken: session.inviteId,
          participantName,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to start the interview.");
      }

      sessionIdRef.current = payload.sessionId;
      setRoomName(payload.roomName);

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      room
        .on(RoomEvent.Reconnecting, () => {
          setSession((current) => ({
            ...current,
            state: transitionSession(current.state, "reconnecting"),
            events: [
              ...current.events,
              {
                type: "reconnect-started",
                detail: "Room reconnect started.",
                createdAt: new Date().toISOString(),
              },
            ],
          }));
          void persistSessionEvent("reconnect-started", "Room reconnect started.", "reconnecting");
        })
        .on(RoomEvent.Reconnected, () => {
          setSession((current) => ({
            ...current,
            state: transitionSession(current.state, "live"),
            events: [
              ...current.events,
              {
                type: "reconnect-succeeded",
                detail: "Room reconnect succeeded.",
                createdAt: new Date().toISOString(),
              },
            ],
          }));
          void persistSessionEvent("reconnect-succeeded", "Room reconnect succeeded.", "live");
        })
        .on(RoomEvent.Disconnected, () => {
          setSession((current) => ({
            ...current,
            state:
              current.state === "completed" || current.state === "failed"
                ? current.state
                : "interrupted",
            events: [
              ...current.events,
              {
                type: "participant-left",
                detail: "Room disconnected.",
                createdAt: new Date().toISOString(),
              },
            ],
          }));
          void persistSessionEvent("participant-left", "Room disconnected.", "interrupted");
        })
        .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.kind === "audio") {
            const audioElement = track.attach();
            audioElement.autoplay = true;
            document.body.appendChild(audioElement);
          }

          void persistTranscriptSegment({
            sessionId: payload.sessionId,
            segmentId: `${participant.identity}-${publication.trackSid}`,
            speaker: participant.isAgent ? "agent" : "candidate",
            text: `Track subscribed: ${publication.source}`,
            status: "final",
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
          }).catch(() => null);
        });

      await room.connect(payload.wsUrl, payload.token);
      await room.localParticipant.setMicrophoneEnabled(true);

      setSession((current) => ({
        ...current,
        state: transitionSession(current.state, "live"),
        events: [
          ...current.events,
          {
            type: "participant-joined",
            detail: `Connected to room ${payload.roomName}.`,
            createdAt: new Date().toISOString(),
          },
        ],
        transcript: mergeTranscriptSegment(current.transcript, {
          id: "system-livekit-connected",
          speaker: "system",
          status: "final",
          text: "LiveKit room connected and microphone enabled.",
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
        }),
      }));

      await persistSessionEvent("participant-joined", `Connected to room ${payload.roomName}.`, "live");
      await persistTranscriptSegment({
        sessionId: payload.sessionId,
        segmentId: "system-livekit-connected",
        speaker: "system",
        text: "LiveKit room connected and microphone enabled.",
        status: "final",
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
      }).catch(() => null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to join interview.";
      setConnectionError(message);
      setSession((current) => ({
        ...current,
        state: "failed",
        events: [
          ...current.events,
          {
            type: "session-failed",
            detail: message,
            createdAt: new Date().toISOString(),
          },
        ],
      }));
      await persistSessionEvent("session-failed", message, "failed");
    }
  }

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        void roomRef.current.disconnect();
      }
    };
  }, []);

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
          <label className="block text-sm font-semibold" htmlFor="participant-name">
            Candidate name
          </label>
          <input
            id="participant-name"
            className="w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none ring-0"
            value={participantName}
            onChange={(event) => setParticipantName(event.target.value)}
            placeholder="Enter the candidate's name"
          />
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
            disabled={session.state !== "live" && session.state !== "reconnecting"}
            onClick={() =>
              setSession((current) => ({
                ...current,
                state:
                  current.state === "live"
                    ? transitionSession(current.state, "reconnecting")
                    : "reconnecting",
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

        {connectionError ? (
          <p className="mt-4 text-sm text-destructive">{connectionError}</p>
        ) : null}
      </section>

      <section className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold">Realtime Status</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4 rounded-lg border px-4 py-3">
              <span className="text-muted-foreground">Invite</span>
              <span className="font-medium">{session.inviteId}</span>
            </div>
            <div className="flex justify-between gap-4 rounded-lg border px-4 py-3">
              <span className="text-muted-foreground">Room</span>
              <span className="font-medium">{roomName ?? "Not connected yet"}</span>
            </div>
          </div>
        </div>

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
