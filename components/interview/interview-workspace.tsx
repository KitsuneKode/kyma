"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Room, RoomEvent } from "livekit-client";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { mergeInterviewSnapshot } from "@/lib/interview/snapshot";
import { isPreflightComplete, markPreflightStep } from "@/lib/interview/preflight";
import { getSessionStateLabel, transitionSession } from "@/lib/interview/session-machine";
import { upsertTranscriptSegment as mergeTranscriptSegment } from "@/lib/interview/transcript";
import { type InterviewSessionSnapshot } from "@/lib/interview/types";

type InterviewWorkspaceProps = {
  initialSnapshot: InterviewSessionSnapshot;
};

type PresenceParticipant = {
  identity: string;
  role: "agent" | "candidate";
};

function isSupportedBrowser() {
  return (
    typeof window !== "undefined" &&
    Boolean(window.RTCPeerConnection) &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    (window.isSecureContext || window.location.hostname === "localhost")
  );
}

function getNetworkLabel() {
  const connection = (navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      downlink?: number;
    };
  }).connection as
    | {
        effectiveType?: string;
        downlink?: number;
      }
    | undefined;

  const detail = [connection?.effectiveType, connection?.downlink ? `${connection.downlink} Mbps` : null]
    .filter(Boolean)
    .join(" / ");

  return detail || "online";
}

async function playSpeakerTone() {
  const AudioContextConstructor = window.AudioContext;

  if (!AudioContextConstructor) {
    throw new Error("Audio playback check is not supported in this browser.");
  }

  const audioContext = new AudioContextConstructor();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 660;
  gainNode.gain.value = 0.05;

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();

  await new Promise((resolve) => window.setTimeout(resolve, 500));

  oscillator.stop();
  await audioContext.close();
}

export function InterviewWorkspace({ initialSnapshot }: InterviewWorkspaceProps) {
  const [session, setSession] = useState(() => {
    const browserStatus =
      typeof window === "undefined" ? "pending" : isSupportedBrowser() ? "passed" : "failed";
    const networkStatus =
      typeof navigator === "undefined"
        ? "pending"
        : navigator.onLine
          ? "passed"
          : "failed";

    return {
      ...initialSnapshot,
      preflight: markPreflightStep(
        markPreflightStep(initialSnapshot.preflight, "browser-check", browserStatus),
        "network-check",
        networkStatus,
      ),
    };
  });
  const [participantName, setParticipantName] = useState(
    initialSnapshot.candidateName ?? "Demo Candidate",
  );
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [speakerTonePlayed, setSpeakerTonePlayed] = useState(false);
  const [environmentConfirmed, setEnvironmentConfirmed] = useState(false);
  const [deviceSummary, setDeviceSummary] = useState<string | null>(null);
  const [hasPreviewStream, setHasPreviewStream] = useState(false);
  const [presence, setPresence] = useState<PresenceParticipant[]>([]);
  const [roomName, setRoomName] = useState<string | null>(initialSnapshot.roomName ?? null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const roomRef = useRef<Room | null>(null);
  const sessionIdRef = useRef<string | null>(initialSnapshot.sessionId ?? null);
  const appendSessionEvent = useMutation(api.interviews.appendSessionEvent);
  const persistTranscriptSegment = useMutation(api.interviews.upsertTranscriptSegment);
  const persistedSession = useQuery(api.interviews.getPublicSessionDetail, {
    inviteToken: initialSnapshot.inviteId,
  });

  const hydratedSession: InterviewSessionSnapshot = useMemo(
    () => mergeInterviewSnapshot(session, persistedSession ?? null),
    [persistedSession, session],
  );
  const allChecksPassed = useMemo(
    () => isPreflightComplete(hydratedSession.preflight),
    [hydratedSession.preflight],
  );
  const displayRoomName = roomName ?? hydratedSession.roomName ?? null;
  const localMeetingReady = hydratedSession.state === "live" || hydratedSession.state === "reconnecting";

  useEffect(() => {
    function syncNetworkStatus() {
      setSession((current) => ({
        ...current,
        preflight: markPreflightStep(
          current.preflight,
          "network-check",
          navigator.onLine ? "passed" : "failed",
        ),
      }));
    }

    syncNetworkStatus();
    window.addEventListener("online", syncNetworkStatus);
    window.addEventListener("offline", syncNetworkStatus);

    return () => {
      window.removeEventListener("online", syncNetworkStatus);
      window.removeEventListener("offline", syncNetworkStatus);
    };
  }, []);

  useEffect(() => {
    if (!previewVideoRef.current) {
      return;
    }

    previewVideoRef.current.srcObject = previewStreamRef.current;
  }, [cameraEnabled, hasPreviewStream]);

  useEffect(() => {
    if (!persistedSession) {
      return;
    }

    sessionIdRef.current = persistedSession.sessionId ?? null;
  }, [persistedSession]);

  useEffect(() => {
    return () => {
      previewStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (roomRef.current) {
        void roomRef.current.disconnect();
      }
    };
  }, []);

  async function persistSessionEvent(
    type: string,
    detail: string,
    state?: InterviewSessionSnapshot["state"],
  ) {
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

  function syncPresence(room: Room) {
    const remoteParticipants = Array.from(room.remoteParticipants.values()).map((participant) => ({
      identity: participant.identity,
      role: participant.isAgent ? ("agent" as const) : ("candidate" as const),
    }));

    setPresence([
      {
        identity: room.localParticipant.identity,
        role: "candidate",
      },
      ...remoteParticipants,
    ]);
  }

  async function runDeviceCheck() {
    setConnectionError(null);

    try {
      previewStreamRef.current?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: cameraEnabled,
      });

      previewStreamRef.current = stream;
      setHasPreviewStream(true);

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((device) => device.kind === "audioinput").length;
      const videoInputs = devices.filter((device) => device.kind === "videoinput").length;

      setDeviceSummary(
        `${audioInputs} mic${audioInputs === 1 ? "" : "s"} detected${
          cameraEnabled ? `, ${videoInputs} camera${videoInputs === 1 ? "" : "s"} detected` : ""
        }`,
      );

      setSession((current) => ({
        ...current,
        preflight: markPreflightStep(current.preflight, "microphone-check", "passed"),
        events: [
          ...current.events,
          {
            type: "preflight-completed",
            detail: "Microphone access granted and preview started.",
            createdAt: new Date().toISOString(),
          },
        ],
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to access microphone and camera devices.";

      setConnectionError(message);
      setDeviceSummary(null);
      setHasPreviewStream(false);
      setSession((current) => ({
        ...current,
        preflight: markPreflightStep(current.preflight, "microphone-check", "failed"),
      }));
    }
  }

  async function handleSpeakerTest() {
    setConnectionError(null);

    try {
      await playSpeakerTone();
      setSpeakerTonePlayed(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to run the speaker playback check.";

      setConnectionError(message);
      setSpeakerTonePlayed(false);
      setSession((current) => ({
        ...current,
        preflight: markPreflightStep(current.preflight, "speaker-check", "failed"),
      }));
    }
  }

  function confirmSpeakerCheck() {
    if (!speakerTonePlayed) {
      return;
    }

    setSession((current) => ({
      ...current,
      preflight: markPreflightStep(current.preflight, "speaker-check", "passed"),
      events: [
        ...current.events,
        {
          type: "preflight-completed",
          detail: "Candidate confirmed speaker playback.",
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }

  async function startJoin() {
    setConnectionError(null);

    if (!previewStreamRef.current) {
      await runDeviceCheck();
    }

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
      const response = await fetch("/api/interviews/bootstrap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inviteToken: hydratedSession.inviteId,
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
        .on(RoomEvent.ParticipantConnected, (participant) => {
          const detail = `${participant.identity} joined the room.`;

          syncPresence(room);
          setSession((current) => ({
            ...current,
            events: [
              ...current.events,
              {
                type: "participant-joined",
                detail,
                createdAt: new Date().toISOString(),
              },
            ],
          }));

          void persistSessionEvent("participant-joined", detail, "live");
        })
        .on(RoomEvent.ParticipantDisconnected, (participant) => {
          const detail = `${participant.identity} left the room.`;

          syncPresence(room);
          setSession((current) => ({
            ...current,
            events: [
              ...current.events,
              {
                type: "participant-left",
                detail,
                createdAt: new Date().toISOString(),
              },
            ],
          }));

          void persistSessionEvent("participant-left", detail, hydratedSession.state);
        })
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
          syncPresence(room);
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
            text: `${participant.identity} media track subscribed (${publication.source}).`,
            status: "final",
            startedAt: new Date().toISOString(),
            endedAt: new Date().toISOString(),
          }).catch(() => null);
        })
        .on(RoomEvent.Disconnected, () => {
          syncPresence(room);
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
        });

      await room.connect(payload.wsUrl, payload.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      await room.localParticipant.setCameraEnabled(cameraEnabled);

      syncPresence(room);

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
          text: "LiveKit room connected and local media published.",
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
        }),
      }));

      await persistSessionEvent("participant-joined", `Connected to room ${payload.roomName}.`, "live");
      await persistTranscriptSegment({
        sessionId: payload.sessionId,
        segmentId: "system-livekit-connected",
        speaker: "system",
        text: "LiveKit room connected and local media published.",
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

  async function toggleMicrophone() {
    const room = roomRef.current;

    if (!room) {
      return;
    }

    const enabled = !room.localParticipant.isMicrophoneEnabled;

    await room.localParticipant.setMicrophoneEnabled(enabled);
    setSession((current) => ({
      ...current,
      events: [
        ...current.events,
        {
          type: enabled ? "participant-joined" : "participant-left",
          detail: enabled ? "Microphone enabled." : "Microphone muted.",
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  }

  async function toggleCamera() {
    const room = roomRef.current;

    if (!room) {
      setCameraEnabled((current) => !current);
      return;
    }

    const enabled = !room.localParticipant.isCameraEnabled;

    await room.localParticipant.setCameraEnabled(enabled);
    setCameraEnabled(enabled);
  }

  async function leaveInterview() {
    if (!roomRef.current) {
      return;
    }

    await roomRef.current.disconnect(true);
    setPresence([]);
    setSession((current) => ({
      ...current,
      state: "completed",
      events: [
        ...current.events,
        {
          type: "participant-left",
          detail: "Candidate left the interview room.",
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    await persistSessionEvent("participant-left", "Candidate left the interview room.", "completed");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Candidate Workspace
            </p>
            <h1 className="text-2xl font-semibold">{hydratedSession.templateName}</h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Demo invite flow for the real meeting path. This should behave like a true lobby and
              room join, not a fake simulator.
            </p>
          </div>
          <div className="rounded-full border px-3 py-1 text-xs font-medium">
            {getSessionStateLabel(hydratedSession.state)}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <div className="space-y-2">
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

            <div className="rounded-xl border p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">Local preview</p>
                  <p className="text-xs text-muted-foreground">
                    Mic access is required. Camera is optional for the MVP, but the call surface is ready for it.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setCameraEnabled((current) => !current)}>
                  {cameraEnabled ? "Camera On" : "Camera Off"}
                </Button>
              </div>
              <div className="mt-4 overflow-hidden rounded-lg border bg-muted/40">
                {cameraEnabled ? (
                  <video
                    ref={previewVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="aspect-video w-full bg-black object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center text-sm text-muted-foreground">
                    Camera preview is off. You can still run the interview in audio-first mode.
                  </div>
                )}
              </div>
              {deviceSummary ? (
                <p className="mt-3 text-xs text-muted-foreground">{deviceSummary}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Lobby checks</h2>
            <div className="space-y-2">
              {hydratedSession.preflight.map((step) => (
                <div
                  key={step.key}
                  className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="min-w-14 text-right text-xs text-muted-foreground">
                      {step.status}
                    </span>
                    {step.key === "browser-check" ? (
                      <Button size="sm" variant="outline" disabled>
                        {isSupportedBrowser() ? "Ready" : "Unsupported"}
                      </Button>
                    ) : null}
                    {step.key === "microphone-check" ? (
                      <Button size="sm" variant="outline" onClick={runDeviceCheck}>
                        Check devices
                      </Button>
                    ) : null}
                    {step.key === "speaker-check" ? (
                      <>
                        <Button size="sm" variant="outline" onClick={handleSpeakerTest}>
                          Play tone
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!speakerTonePlayed}
                          onClick={confirmSpeakerCheck}
                        >
                          I heard it
                        </Button>
                      </>
                    ) : null}
                    {step.key === "network-check" ? (
                      <Button size="sm" variant="outline" disabled>
                        {navigator.onLine ? getNetworkLabel() : "offline"}
                      </Button>
                    ) : null}
                    {step.key === "environment-check" ? (
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={environmentConfirmed}
                          onChange={(event) => {
                            const nextChecked = event.target.checked;

                            setEnvironmentConfirmed(nextChecked);
                            setSession((current) => ({
                              ...current,
                              preflight: markPreflightStep(
                                current.preflight,
                                "environment-check",
                                nextChecked ? "passed" : "pending",
                              ),
                            }));
                          }}
                        />
                        Quiet room
                      </label>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                disabled={!allChecksPassed || participantName.trim().length < 2 || hydratedSession.state !== "ready"}
                onClick={startJoin}
              >
                Join interview room
              </Button>
              <Button
                variant="outline"
                disabled={!localMeetingReady}
                onClick={toggleMicrophone}
              >
                Toggle mic
              </Button>
              <Button variant="outline" onClick={toggleCamera}>
                Toggle camera
              </Button>
              <Button variant="outline" disabled={!localMeetingReady} onClick={leaveInterview}>
                Leave room
              </Button>
            </div>

            {connectionError ? (
              <p className="text-sm text-destructive">{connectionError}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold">Meeting phase</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4 rounded-lg border px-4 py-3">
              <span className="text-muted-foreground">Invite</span>
              <span className="font-medium">{hydratedSession.inviteId}</span>
            </div>
            <div className="flex justify-between gap-4 rounded-lg border px-4 py-3">
              <span className="text-muted-foreground">Room</span>
              <span className="font-medium">{displayRoomName ?? "Not connected yet"}</span>
            </div>
            <div className="flex justify-between gap-4 rounded-lg border px-4 py-3">
              <span className="text-muted-foreground">Session</span>
              <span className="font-medium">{hydratedSession.sessionId ?? "Not created yet"}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Candidate
              </p>
              <p className="mt-2 text-sm font-medium">{participantName || "Unnamed candidate"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {hasPreviewStream ? "Local media is ready." : "Run device check to prepare local media."}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Interviewer
              </p>
              <p className="mt-2 text-sm font-medium">
                {presence.some((participant) => participant.role === "agent")
                  ? "Agent connected"
                  : "Waiting for the agent worker"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Start `bun run agent:dev` with valid LiveKit credentials before testing.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Participants
            </p>
            <div className="mt-3 space-y-2">
              {presence.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No one is connected yet. Join the room to move from lobby to live meeting.
                </p>
              ) : (
                presence.map((participant) => (
                  <div
                    key={`${participant.role}-${participant.identity}`}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <span className="text-sm font-medium">{participant.identity}</span>
                    <span className="text-xs text-muted-foreground">{participant.role}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold">Session timeline</h2>
          <div className="mt-4 space-y-3">
            {hydratedSession.events.map((event: InterviewSessionSnapshot["events"][number]) => (
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
            {hydratedSession.transcript.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Transcript segments will appear here once the room and agent are active.
              </p>
            ) : (
              hydratedSession.transcript.map(
                (segment: InterviewSessionSnapshot["transcript"][number]) => (
                  <div key={segment.id} className="rounded-lg border px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {segment.speaker}
                    </p>
                    <p className="mt-1 text-sm">{segment.text}</p>
                  </div>
                ),
              )
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
