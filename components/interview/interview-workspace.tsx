"use client"

import { type LocalUserChoices } from "@livekit/components-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import {
  type DisconnectReason,
  Room,
  RoomEvent,
  type Participant,
  type TrackPublication,
  type TranscriptionSegment,
} from "livekit-client"

import { api } from "@/convex/_generated/api"
import { InviteLobby } from "@/components/interview/invite-lobby"
import { InviteAccessScreen } from "@/components/interview/invite-access-screen"
import { MeetingShell } from "@/components/interview/meeting-shell"
import { SessionOverview } from "@/components/interview/session-overview"
import { SessionTimeline } from "@/components/interview/session-timeline"
import { TranscriptRail } from "@/components/interview/transcript-rail"
import {
  bootstrapInterviewSession,
  type BootstrappedInterviewSession,
} from "@/lib/interview/bootstrap"
import {
  createDiagnosticLogger,
  createRequestId,
} from "@/lib/interview/diagnostics"
import { mergeInterviewSnapshot } from "@/lib/interview/snapshot"
import { type InterviewSessionSnapshot } from "@/lib/interview/types"

type InterviewWorkspaceProps = {
  initialSnapshot: InterviewSessionSnapshot
}

type InterviewView = "prejoin" | "meeting" | "processing"

function createLocalEvent(
  type: InterviewSessionSnapshot["events"][number]["type"],
  detail: string
) {
  return {
    type,
    detail,
    createdAt: new Date().toISOString(),
  }
}

function toIsoTimestamp(timestamp: number) {
  return new Date(timestamp).toISOString()
}

function getTranscriptSpeaker(
  room: Room,
  participant?: Participant,
  publication?: TrackPublication
) {
  if (!participant) {
    return publication ? "agent" : "system"
  }

  if (
    participant.isLocal ||
    participant.identity === room.localParticipant.identity
  ) {
    return "candidate"
  }

  return "agent"
}

function upsertLocalTranscriptSegment(
  transcript: InterviewSessionSnapshot["transcript"],
  segment: {
    id: string
    speaker: InterviewSessionSnapshot["transcript"][number]["speaker"]
    text: string
    status: InterviewSessionSnapshot["transcript"][number]["status"]
    startedAt: string
    endedAt?: string
  }
) {
  const index = transcript.findIndex((item) => item.id === segment.id)

  if (index === -1) {
    return [...transcript, segment]
  }

  const next = [...transcript]
  next[index] = {
    ...next[index],
    ...segment,
  }
  return next
}

function summarizeTranscriptEvent(
  speaker: InterviewSessionSnapshot["transcript"][number]["speaker"],
  text: string
) {
  const speakerLabel =
    speaker === "candidate"
      ? "Candidate"
      : speaker === "agent"
        ? "Interviewer"
        : "System"
  const normalized = text.trim().replace(/\s+/g, " ")
  const excerpt =
    normalized.length > 120 ? `${normalized.slice(0, 117).trimEnd()}...` : normalized

  return `${speakerLabel}: ${excerpt}`
}

export function InterviewWorkspace({
  initialSnapshot,
}: InterviewWorkspaceProps) {
  const [requestId] = useState(() => createRequestId("client"))
  const [view, setView] = useState<InterviewView>(() =>
    initialSnapshot.state === "processing" ||
    initialSnapshot.state === "completed"
      ? "processing"
      : "prejoin"
  )
  const [session, setSession] = useState(initialSnapshot)
  const [participantName, setParticipantName] = useState(
    initialSnapshot.candidateName ?? "Demo Candidate"
  )
  const [preJoinChoices, setPreJoinChoices] = useState<LocalUserChoices | null>(
    null
  )
  const [bootstrappedSession, setBootstrappedSession] =
    useState<BootstrappedInterviewSession | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(false)
  const [isSubmittingInterview, setIsSubmittingInterview] = useState(false)
  const room = useMemo(
    () =>
      new Room({
        adaptiveStream: true,
        dynacast: true,
      }),
    []
  )
  const completionRequestedRef = useRef(false)
  const sessionIdRef = useRef<string | null>(initialSnapshot.sessionId ?? null)
  const roomNameRef = useRef<string | null>(initialSnapshot.roomName ?? null)
  const participantNameRef = useRef(participantName)
  const appendSessionEvent = useMutation(api.interviews.appendSessionEvent)
  const upsertTranscriptSegment = useMutation(
    api.interviews.upsertTranscriptSegment
  )
  const persistedSession = useQuery(api.interviews.getPublicSessionDetail, {
    inviteToken: initialSnapshot.inviteId,
  })

  const logger = useMemo(
    () =>
      createDiagnosticLogger("candidate-ui", {
        actor: "candidate",
        requestId,
        inviteToken: initialSnapshot.inviteId,
      }),
    [initialSnapshot.inviteId, requestId]
  )
  const hydratedSession = useMemo(
    () => mergeInterviewSnapshot(session, persistedSession ?? null),
    [persistedSession, session]
  )

  useEffect(() => {
    sessionIdRef.current = hydratedSession.sessionId ?? null
    roomNameRef.current = hydratedSession.roomName ?? null
  }, [hydratedSession.roomName, hydratedSession.sessionId])

  useEffect(() => {
    participantNameRef.current = participantName
  }, [participantName])

  useEffect(() => {
    async function persistEffectEvent(
      type: string,
      detail: string,
      state?: InterviewSessionSnapshot["state"]
    ) {
      if (!sessionIdRef.current) {
        return
      }

      await appendSessionEvent({
        sessionId: sessionIdRef.current as never,
        type,
        detail,
        state,
      }).catch(() => null)
    }

    function handleParticipantConnected(
      participant: Room["remoteParticipants"] extends Map<string, infer Value>
        ? Value
        : never
    ) {
      const detail = `${participant.identity} joined the room.`
      logger.info({
        event: "room.participant.connected",
        detail,
        sessionId: sessionIdRef.current ?? undefined,
        roomName: roomNameRef.current ?? undefined,
        participantIdentity: participant.identity,
      })
      setSession((current) => ({
        ...current,
        events: [
          ...current.events,
          createLocalEvent("participant-joined", detail),
        ],
      }))
      void persistEffectEvent("participant-joined", detail, "live")
    }

    function handleParticipantDisconnected(
      participant: Room["remoteParticipants"] extends Map<string, infer Value>
        ? Value
        : never
    ) {
      const detail = `${participant.identity} left the room.`
      logger.warn({
        event: "room.participant.disconnected",
        detail,
        sessionId: sessionIdRef.current ?? undefined,
        roomName: roomNameRef.current ?? undefined,
        participantIdentity: participant.identity,
      })
      setSession((current) => ({
        ...current,
        events: [
          ...current.events,
          createLocalEvent("participant-left", detail),
        ],
      }))
      void persistEffectEvent("participant-left", detail)
    }

    function handleReconnecting() {
      logger.warn({
        event: "room.reconnecting",
        detail: "LiveKit room reconnect started.",
        sessionId: sessionIdRef.current ?? undefined,
        roomName: roomNameRef.current ?? undefined,
        stateFrom: "live",
        stateTo: "reconnecting",
      })
      setSession((current) => ({
        ...current,
        state: "reconnecting",
        events: [
          ...current.events,
          createLocalEvent("reconnect-started", "Room reconnect started."),
        ],
      }))
      void persistEffectEvent(
        "reconnect-started",
        "Room reconnect started.",
        "reconnecting"
      )
    }

    function handleReconnected() {
      logger.info({
        event: "room.reconnected",
        detail: "LiveKit room reconnect succeeded.",
        sessionId: sessionIdRef.current ?? undefined,
        roomName: roomNameRef.current ?? undefined,
        stateFrom: "reconnecting",
        stateTo: "live",
      })
      setSession((current) => ({
        ...current,
        state: "live",
        events: [
          ...current.events,
          createLocalEvent("reconnect-succeeded", "Room reconnect succeeded."),
        ],
      }))
      void persistEffectEvent(
        "reconnect-succeeded",
        "Room reconnect succeeded.",
        "live"
      )
    }

    function handleDisconnected() {
      if (completionRequestedRef.current) {
        logger.info({
          event: "room.disconnected.after-submit",
          detail:
            "Room disconnected after the candidate submitted the interview.",
          sessionId: sessionIdRef.current ?? undefined,
          roomName: roomNameRef.current ?? undefined,
        })
        setBootstrappedSession(null)
        setView("processing")
        setSession((current) => ({
          ...current,
          state: "processing",
          events: [
            ...current.events,
            createLocalEvent(
              "participant-left",
              "Candidate left the room after submitting the interview."
            ),
          ],
        }))
        return
      }

      logger.warn({
        event: "room.disconnected",
        detail: "Room disconnected before the interview was submitted.",
        sessionId: sessionIdRef.current ?? undefined,
        roomName: roomNameRef.current ?? undefined,
      })
      setBootstrappedSession(null)
      setView("prejoin")
      setSession((current) => ({
        ...current,
        state: "interrupted",
        events: [
          ...current.events,
          createLocalEvent("participant-left", "Room disconnected."),
        ],
      }))
      void persistEffectEvent(
        "participant-left",
        "Room disconnected.",
        "interrupted"
      )
    }

    function handleTranscriptionReceived(
      transcription: TranscriptionSegment[],
      participant?: Participant,
      publication?: TrackPublication
    ) {
      const speaker = getTranscriptSpeaker(room, participant, publication)
      const participantIdentity = participant?.identity

      logger.debug({
        event: "transcription.received",
        detail: `Received ${transcription.length} transcription segment(s).`,
        sessionId: sessionIdRef.current ?? undefined,
        roomName: roomNameRef.current ?? undefined,
        participantIdentity,
        meta: {
          speaker,
          publicationSid: publication?.trackSid,
        },
      })

      for (const segment of transcription) {
        const startedAt = toIsoTimestamp(segment.startTime)
        const endedAt = segment.endTime
          ? toIsoTimestamp(segment.endTime)
          : undefined
        const status = segment.final ? "final" : "partial"

        setSession((current) => ({
          ...current,
          transcript: upsertLocalTranscriptSegment(current.transcript, {
            id: segment.id,
            speaker,
            text: segment.text,
            status,
            startedAt,
            endedAt,
          }),
        }))

        void upsertTranscriptSegment({
          sessionId: sessionIdRef.current as never,
          segmentId: segment.id,
          speaker,
          text: segment.text,
          status,
          startedAt,
          endedAt,
        }).catch((error) => {
          logger.error({
            event: "transcription.persist.failed",
            detail: "Unable to persist transcription segment.",
            sessionId: sessionIdRef.current ?? undefined,
            roomName: roomNameRef.current ?? undefined,
            participantIdentity,
            error,
            meta: {
              speaker,
              segmentId: segment.id,
              status,
            },
          })
        })

        if (status === "final" && segment.text.trim()) {
          const detail = summarizeTranscriptEvent(speaker, segment.text)

          setSession((current) => ({
            ...current,
            events: [...current.events, createLocalEvent("transcript-final", detail)],
          }))
          void persistEffectEvent("transcript-final", detail)
        }
      }
    }

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected)
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
    room.on(RoomEvent.Reconnecting, handleReconnecting)
    room.on(RoomEvent.Reconnected, handleReconnected)
    room.on(RoomEvent.Disconnected, handleDisconnected)
    room.on(RoomEvent.TranscriptionReceived, handleTranscriptionReceived)

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected)
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
      room.off(RoomEvent.Reconnecting, handleReconnecting)
      room.off(RoomEvent.Reconnected, handleReconnected)
      room.off(RoomEvent.Disconnected, handleDisconnected)
      room.off(RoomEvent.TranscriptionReceived, handleTranscriptionReceived)
    }
  }, [appendSessionEvent, logger, room, upsertTranscriptSegment])

  useEffect(() => {
    return () => {
      void room.disconnect()
    }
  }, [room])

  async function persistSessionEvent(
    type: string,
    detail: string,
    state?: InterviewSessionSnapshot["state"]
  ) {
    if (!sessionIdRef.current) {
      return
    }

    await appendSessionEvent({
      sessionId: sessionIdRef.current as never,
      type,
      detail,
      state,
    }).catch(() => null)
  }

  async function handlePreJoinSubmit(choices: LocalUserChoices) {
    const candidateName = choices.username.trim() || participantName

    setConnectionError(null)
    setIsBootstrapping(true)
    setPreJoinChoices(choices)
    setParticipantName(candidateName)
    completionRequestedRef.current = false
    logger.info({
      event: "prejoin.completed",
      detail:
        "Candidate completed LiveKit prejoin and requested room bootstrap.",
      participantIdentity: candidateName,
      meta: {
        audioEnabled: choices.audioEnabled,
        videoEnabled: choices.videoEnabled,
      },
    })

    try {
      const payload = await bootstrapInterviewSession({
        inviteToken: initialSnapshot.inviteId,
        participantName: candidateName,
      })

      sessionIdRef.current = payload.sessionId
      roomNameRef.current = payload.roomName
      setBootstrappedSession(payload)
      setView("meeting")
      setSession((current) => ({
        ...current,
        sessionId: payload.sessionId,
        candidateName: candidateName,
        templateName: payload.templateName,
        roomName: payload.roomName,
        state: "connecting",
        events: [
          ...current.events,
          createLocalEvent(
            "room-token-requested",
            "Candidate requested room credentials."
          ),
        ],
      }))
      logger.info({
        event: "bootstrap.succeeded",
        detail:
          "Interview bootstrap succeeded and the room is ready to connect.",
        participantIdentity: candidateName,
        sessionId: payload.sessionId,
        roomName: payload.roomName,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to prepare interview room."

      setConnectionError(message)
      setSession((current) => ({
        ...current,
        state: "ready",
        events: [
          ...current.events,
          createLocalEvent("session-failed", message),
        ],
      }))
      logger.error({
        event: "bootstrap.failed",
        detail: message,
        participantIdentity: candidateName,
        error,
      })
    } finally {
      setIsBootstrapping(false)
    }
  }

  async function handleRoomConnected() {
    logger.info({
      event: "room.connect.succeeded",
      detail: "Candidate connected to LiveKit room.",
      participantIdentity: participantNameRef.current,
      sessionId: sessionIdRef.current ?? undefined,
      roomName: roomNameRef.current ?? undefined,
    })
    setConnectionError(null)
    setSession((current) => ({
      ...current,
      state: "live",
      events: [
        ...current.events,
        createLocalEvent(
          "participant-joined",
          `Connected to room ${roomNameRef.current ?? bootstrappedSession?.roomName ?? "interview room"}.`
        ),
      ],
    }))
    await persistSessionEvent(
      "participant-joined",
      `Connected to room ${roomNameRef.current ?? bootstrappedSession?.roomName ?? "interview room"}.`,
      "live"
    )
  }

  function handleRoomDisconnected(reason?: DisconnectReason) {
    logger.info({
      event: "room.disconnect.callback",
      detail: "LiveKitRoom onDisconnected callback fired.",
      sessionId: sessionIdRef.current ?? undefined,
      roomName: roomNameRef.current ?? undefined,
      meta: {
        reason: reason ?? "unknown",
      },
    })
  }

  function handleRoomError(error: Error) {
    setConnectionError(error.message)
    logger.error({
      event: "room.connect.failed",
      detail: error.message,
      sessionId: sessionIdRef.current ?? undefined,
      roomName: roomNameRef.current ?? undefined,
      participantIdentity: participantNameRef.current,
      error,
    })
  }

  async function handleSubmitInterview() {
    completionRequestedRef.current = true
    setIsSubmittingInterview(true)
    setConnectionError(null)
    logger.info({
      event: "session.processing.started",
      detail: "Candidate submitted the interview for post-call processing.",
      sessionId: sessionIdRef.current ?? undefined,
      roomName: roomNameRef.current ?? undefined,
      participantIdentity: participantNameRef.current,
    })

    try {
      setSession((current) => ({
        ...current,
        state: "processing",
        events: [
          ...current.events,
          createLocalEvent(
            "processing-started",
            "Interview submitted for post-call processing."
          ),
        ],
      }))
      await persistSessionEvent(
        "processing-started",
        "Interview submitted for post-call processing.",
        "processing"
      )
      if (sessionIdRef.current) {
        const response = await fetch("/api/interviews/process", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
          }),
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null
          throw new Error(
            payload?.error ??
              "Unable to start interview processing for this session."
          )
        }
      }
      await room.disconnect(true)
      setBootstrappedSession(null)
      setView("processing")
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit the interview for processing."

      setConnectionError(message)
      completionRequestedRef.current = false
      logger.error({
        event: "session.processing.failed",
        detail: message,
        sessionId: sessionIdRef.current ?? undefined,
        roomName: roomNameRef.current ?? undefined,
        participantIdentity: participantNameRef.current,
        error,
      })
    } finally {
      setIsSubmittingInterview(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section>
        {view === "meeting" && bootstrappedSession && preJoinChoices ? (
          <MeetingShell
            connectionError={connectionError}
            isSubmittingInterview={isSubmittingInterview}
            onConnected={handleRoomConnected}
            onDisconnected={handleRoomDisconnected}
            onError={handleRoomError}
            onSubmitInterview={handleSubmitInterview}
            policy={hydratedSession.policy}
            preJoinChoices={preJoinChoices}
            room={room}
            session={bootstrappedSession}
          />
        ) : view === "processing" ? (
          <div className="rounded-2xl border border-border/80 bg-card/90 p-8 shadow-sm">
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Processing
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              The interview has been submitted for review.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              The live session is complete. We will use the persisted session
              data, transcript artifacts, and report pipeline to generate an
              evidence-backed assessment next.
            </p>
          </div>
        ) : hydratedSession.accessState !== "available" ? (
          <InviteAccessScreen
            accessMessage={hydratedSession.accessMessage}
            accessState={hydratedSession.accessState}
            inviteId={hydratedSession.inviteId}
          />
        ) : (
          <InviteLobby
            candidateName={participantName}
            connectionError={connectionError}
            initialSnapshot={hydratedSession}
            isBootstrapping={isBootstrapping}
            onSubmit={handlePreJoinSubmit}
          />
        )}
      </section>

      <aside className="space-y-6">
        <SessionOverview
          connectionError={connectionError}
          snapshot={hydratedSession}
        />
        <SessionTimeline events={hydratedSession.events} />
        <TranscriptRail transcript={hydratedSession.transcript} />
      </aside>
    </div>
  )
}
