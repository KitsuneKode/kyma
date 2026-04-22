'use client'

import { type LocalUserChoices } from '@livekit/components-react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import {
  type DisconnectReason,
  Room,
  RoomEvent,
  type Participant,
  Track,
  type TrackPublication,
  type TranscriptionSegment,
} from 'livekit-client'

import { api } from '@/convex/_generated/api'
import { InviteLobby } from '@/components/interview/invite-lobby'
import { InviteAccessScreen } from '@/components/interview/invite-access-screen'
import { MeetingShell } from '@/components/interview/meeting-shell'
import { Button } from '@/components/ui/button'
import {
  bootstrapInterviewSession,
  type BootstrappedInterviewSession,
} from '@/lib/interview/bootstrap'
import {
  createDiagnosticLogger,
  createRequestId,
} from '@/lib/interview/diagnostics'
import { mergeInterviewSnapshot } from '@/lib/interview/snapshot'
import { type InterviewSessionSnapshot } from '@/lib/interview/types'

type InterviewWorkspaceProps = {
  initialSnapshot: InterviewSessionSnapshot
}

type InterviewView = 'prejoin' | 'meeting' | 'processing'

function createLocalEvent(
  type: InterviewSessionSnapshot['events'][number]['type'],
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
    return publication ? 'agent' : 'system'
  }

  if (
    participant.isLocal ||
    participant.identity === room.localParticipant.identity
  ) {
    return 'candidate'
  }

  return 'agent'
}

function upsertLocalTranscriptSegment(
  transcript: InterviewSessionSnapshot['transcript'],
  segment: {
    id: string
    speaker: InterviewSessionSnapshot['transcript'][number]['speaker']
    text: string
    status: InterviewSessionSnapshot['transcript'][number]['status']
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
  speaker: InterviewSessionSnapshot['transcript'][number]['speaker'],
  text: string
) {
  const speakerLabel =
    speaker === 'candidate'
      ? 'Candidate'
      : speaker === 'agent'
        ? 'Interviewer'
        : 'System'
  const normalized = text.trim().replace(/\s+/g, ' ')
  const excerpt =
    normalized.length > 120
      ? `${normalized.slice(0, 117).trimEnd()}...`
      : normalized

  return `${speakerLabel}: ${excerpt}`
}

function emitDebugLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>
) {
  // #region agent log
  fetch('http://127.0.0.1:7775/ingest/c816eaeb-acd1-4edb-bd45-1464db25af33', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'af8e6a',
    },
    body: JSON.stringify({
      sessionId: 'af8e6a',
      runId: 'baseline',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion
}

export function InterviewWorkspace({
  initialSnapshot,
}: InterviewWorkspaceProps) {
  const [requestId] = useState(() => createRequestId('client'))
  const [view, setView] = useState<InterviewView>(() =>
    initialSnapshot.state === 'processing' ||
    initialSnapshot.state === 'completed'
      ? 'processing'
      : 'prejoin'
  )
  const [session, setSession] = useState(initialSnapshot)
  const [participantName, setParticipantName] = useState(
    initialSnapshot.candidateName ?? 'Demo Candidate'
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
  const lastFinalSegmentRef = useRef<{
    speaker: InterviewSessionSnapshot['transcript'][number]['speaker']
    endedAtMs: number | null
  } | null>(null)
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
      createDiagnosticLogger('candidate-ui', {
        actor: 'candidate',
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
      state?: InterviewSessionSnapshot['state']
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
      participant: Room['remoteParticipants'] extends Map<string, infer Value>
        ? Value
        : never
    ) {
      emitDebugLog(
        'J3',
        'components/interview/interview-workspace.tsx:handleParticipantConnected',
        'remote participant connected',
        {
          participantIdentity: participant.identity,
          isAgentLike:
            participant.identity.includes('agent') ||
            participant.identity.includes('tutor-screener'),
        }
      )
      const detail = `${participant.identity} joined the room.`
      logger.info({
        event: 'room.participant.connected',
        detail,
        sessionId: sessionIdRef.current ?? undefined,
        roomName: roomNameRef.current ?? undefined,
        participantIdentity: participant.identity,
      })
      setSession((current) => ({
        ...current,
        events: [
          ...current.events,
          createLocalEvent('participant-joined', detail),
        ],
      }))
      void persistEffectEvent('participant-joined', detail, 'live')
    }

    function handleParticipantDisconnected(
      participant: Room['remoteParticipants'] extends Map<string, infer Value>
        ? Value
        : never
    ) {
      const detail = `${participant.identity} left the room.`
      logger.warn({
        event: 'room.participant.disconnected',
        detail,
        sessionId: sessionIdRef.current ?? undefined,
        roomName: roomNameRef.current ?? undefined,
        participantIdentity: participant.identity,
      })
      setSession((current) => ({
        ...current,
        events: [
          ...current.events,
          createLocalEvent('participant-left', detail),
        ],
      }))
      void persistEffectEvent('participant-left', detail)
    }

    function handleLocalTrackPublished(publication: TrackPublication) {
      if (publication.source !== Track.Source.ScreenShare) {
        return
      }

      const detail =
        'Candidate started screen sharing for the teaching segment.'
      logger.info({
        event: 'room.screen-share.started',
        detail,
        sessionId: sessionIdRef.current ?? undefined,
        roomName: roomNameRef.current ?? undefined,
        participantIdentity: room.localParticipant.identity,
      })
      setSession((current) => ({
        ...current,
        events: [
          ...current.events,
          createLocalEvent('candidate-screen-share-started', detail),
        ],
      }))
      void persistEffectEvent('candidate-screen-share-started', detail, 'live')
    }

    function handleLocalTrackUnpublished(publication: TrackPublication) {
      if (publication.source !== Track.Source.ScreenShare) {
        return
      }

      const detail = 'Candidate stopped screen sharing.'
      logger.info({
        event: 'room.screen-share.stopped',
        detail,
        sessionId: sessionIdRef.current ?? undefined,
        roomName: roomNameRef.current ?? undefined,
        participantIdentity: room.localParticipant.identity,
      })
      setSession((current) => ({
        ...current,
        events: [
          ...current.events,
          createLocalEvent('candidate-screen-share-stopped', detail),
        ],
      }))
      void persistEffectEvent('candidate-screen-share-stopped', detail, 'live')
    }

    function handleReconnecting() {
      logger.warn({
        event: 'room.reconnecting',
        detail: 'LiveKit room reconnect started.',
        sessionId: sessionIdRef.current ?? undefined,
        roomName: roomNameRef.current ?? undefined,
        stateFrom: 'live',
        stateTo: 'reconnecting',
      })
      setSession((current) => ({
        ...current,
        state: 'reconnecting',
        events: [
          ...current.events,
          createLocalEvent('reconnect-started', 'Room reconnect started.'),
        ],
      }))
      void persistEffectEvent(
        'reconnect-started',
        'Room reconnect started.',
        'reconnecting'
      )
    }

    function handleReconnected() {
      logger.info({
        event: 'room.reconnected',
        detail: 'LiveKit room reconnect succeeded.',
        sessionId: sessionIdRef.current ?? undefined,
        roomName: roomNameRef.current ?? undefined,
        stateFrom: 'reconnecting',
        stateTo: 'live',
      })
      setSession((current) => ({
        ...current,
        state: 'live',
        events: [
          ...current.events,
          createLocalEvent('reconnect-succeeded', 'Room reconnect succeeded.'),
        ],
      }))
      void persistEffectEvent(
        'reconnect-succeeded',
        'Room reconnect succeeded.',
        'live'
      )
    }

    function handleDisconnected() {
      if (completionRequestedRef.current) {
        logger.info({
          event: 'room.disconnected.after-submit',
          detail:
            'Room disconnected after the candidate submitted the interview.',
          sessionId: sessionIdRef.current ?? undefined,
          roomName: roomNameRef.current ?? undefined,
        })
        setBootstrappedSession(null)
        setView('processing')
        setSession((current) => ({
          ...current,
          state: 'processing',
          events: [
            ...current.events,
            createLocalEvent(
              'participant-left',
              'Candidate left the room after submitting the interview.'
            ),
          ],
        }))
        return
      }

      logger.warn({
        event: 'room.disconnected',
        detail: 'Room disconnected before the interview was submitted.',
        sessionId: sessionIdRef.current ?? undefined,
        roomName: roomNameRef.current ?? undefined,
      })
      setBootstrappedSession(null)
      setView('prejoin')
      setSession((current) => ({
        ...current,
        state: 'interrupted',
        events: [
          ...current.events,
          createLocalEvent('participant-left', 'Room disconnected.'),
        ],
      }))
      void persistEffectEvent(
        'participant-left',
        'Room disconnected.',
        'interrupted'
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
        event: 'transcription.received',
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
        const status = segment.final ? 'final' : 'partial'

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
            event: 'transcription.persist.failed',
            detail: 'Unable to persist transcription segment.',
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

        if (status === 'final' && segment.text.trim()) {
          const endedAtMs = segment.endTime || null

          lastFinalSegmentRef.current = { speaker, endedAtMs }

          const detail = summarizeTranscriptEvent(speaker, segment.text)

          setSession((current) => ({
            ...current,
            events: [
              ...current.events,
              createLocalEvent('transcript-final', detail),
            ],
          }))
          void persistEffectEvent('transcript-final', detail)
        }
      }
    }

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected)
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
    room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
    room.on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished)
    room.on(RoomEvent.Reconnecting, handleReconnecting)
    room.on(RoomEvent.Reconnected, handleReconnected)
    room.on(RoomEvent.Disconnected, handleDisconnected)
    room.on(RoomEvent.TranscriptionReceived, handleTranscriptionReceived)

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected)
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
      room.off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
      room.off(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished)
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
    state?: InterviewSessionSnapshot['state']
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
      event: 'prejoin.completed',
      detail:
        'Candidate completed LiveKit prejoin and requested room bootstrap.',
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
      setView('meeting')
      setSession((current) => ({
        ...current,
        sessionId: payload.sessionId,
        candidateName: candidateName,
        templateName: payload.templateName,
        roomName: payload.roomName,
        state: 'connecting',
        events: [
          ...current.events,
          createLocalEvent(
            'room-token-requested',
            'Candidate requested room credentials.'
          ),
        ],
      }))
      logger.info({
        event: 'bootstrap.succeeded',
        detail:
          'Interview bootstrap succeeded and the room is ready to connect.',
        participantIdentity: candidateName,
        sessionId: payload.sessionId,
        roomName: payload.roomName,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to prepare interview room.'

      setConnectionError(message)
      setSession((current) => ({
        ...current,
        state: 'ready',
        events: [
          ...current.events,
          createLocalEvent('session-failed', message),
        ],
      }))
      logger.error({
        event: 'bootstrap.failed',
        detail: message,
        participantIdentity: candidateName,
        error,
      })
    } finally {
      setIsBootstrapping(false)
    }
  }

  async function handleRoomConnected() {
    emitDebugLog(
      'J4',
      'components/interview/interview-workspace.tsx:handleRoomConnected',
      'candidate connected to room and awaiting remote participants',
      {
        roomName: roomNameRef.current ?? bootstrappedSession?.roomName ?? null,
      }
    )
    logger.info({
      event: 'room.connect.succeeded',
      detail: 'Candidate connected to LiveKit room.',
      participantIdentity: participantNameRef.current,
      sessionId: sessionIdRef.current ?? undefined,
      roomName: roomNameRef.current ?? undefined,
    })
    setConnectionError(null)
    setSession((current) => ({
      ...current,
      state: 'live',
      events: [
        ...current.events,
        createLocalEvent(
          'participant-joined',
          `Connected to room ${roomNameRef.current ?? bootstrappedSession?.roomName ?? 'interview room'}.`
        ),
      ],
    }))
    await persistSessionEvent(
      'participant-joined',
      `Connected to room ${roomNameRef.current ?? bootstrappedSession?.roomName ?? 'interview room'}.`,
      'live'
    )
  }

  function handleRoomDisconnected(reason?: DisconnectReason) {
    logger.info({
      event: 'room.disconnect.callback',
      detail: 'LiveKitRoom onDisconnected callback fired.',
      sessionId: sessionIdRef.current ?? undefined,
      roomName: roomNameRef.current ?? undefined,
      meta: {
        reason: reason ?? 'unknown',
      },
    })
  }

  function handleRoomError(error: Error) {
    setConnectionError(error.message)
    logger.error({
      event: 'room.connect.failed',
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
    setView('processing')
    logger.info({
      event: 'session.processing.started',
      detail: 'Candidate submitted the interview for post-call processing.',
      sessionId: sessionIdRef.current ?? undefined,
      roomName: roomNameRef.current ?? undefined,
      participantIdentity: participantNameRef.current,
    })

    try {
      setSession((current) => ({
        ...current,
        state: 'processing',
        events: [
          ...current.events,
          createLocalEvent(
            'processing-started',
            'Interview submitted for post-call processing.'
          ),
        ],
      }))
      await persistSessionEvent(
        'processing-started',
        'Interview submitted for post-call processing.',
        'processing'
      )
      if (sessionIdRef.current) {
        const response = await fetch('/api/interviews/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
          }),
        })

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(
            payload?.error ??
              'Unable to start interview processing for this session.'
          )
        }
      }
      await room.disconnect(true)
      setBootstrappedSession(null)
      setView('processing')
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to submit the interview for processing.'

      setConnectionError(message)
      completionRequestedRef.current = false
      logger.error({
        event: 'session.processing.failed',
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
    <div className="h-full w-full">
      {view === 'meeting' && bootstrappedSession && preJoinChoices ? (
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
      ) : view === 'processing' ? (
        <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-background/50 p-4 backdrop-blur-sm">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } },
            }}
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-card p-10 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-border/50"
          >
            <motion.div
              variants={{
                hidden: { scale: 0.8, opacity: 0 },
                visible: {
                  scale: 1,
                  opacity: 1,
                  transition: { type: 'spring', bounce: 0.4, duration: 0.6 },
                },
              }}
              className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 shadow-inner ring-1 ring-emerald-500/20"
            >
              <svg
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <p className="text-xs font-semibold tracking-[0.2em] text-emerald-600/80 uppercase">
                Success
              </p>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Interview Submitted
              </h1>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <p className="mx-auto mt-6 max-w-sm text-base leading-relaxed text-pretty text-muted-foreground">
                Your recording has been securely saved. The team will review the
                conversation and follow up with you shortly.
              </p>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 },
              }}
              className="mt-10"
            >
              <Button
                variant="outline"
                className="rounded-full px-8 py-6 font-medium shadow-sm transition-all active:scale-[0.96]"
                onClick={() => window.close()}
              >
                Close Window
              </Button>
            </motion.div>

            {connectionError ? (
              <motion.div
                variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                className="mt-8 rounded-2xl bg-destructive/10 p-5 text-left shadow-sm ring-1 ring-destructive/20"
              >
                <p className="text-sm font-semibold text-destructive">
                  Submission Warning
                </p>
                <p className="mt-2 text-sm text-destructive/90">
                  {connectionError}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <Button
                    onClick={handleSubmitInterview}
                    size="sm"
                    variant="destructive"
                    className="h-9 rounded-full px-5 transition-transform active:scale-[0.96]"
                  >
                    Retry submission
                  </Button>
                  <p className="text-xs text-destructive/80">
                    If retry fails, contact the recruiter and share your invite
                    token.
                  </p>
                </div>
              </motion.div>
            ) : null}
          </motion.div>
        </div>
      ) : hydratedSession.accessState !== 'available' ? (
        <InviteAccessScreen
          accessMessage={hydratedSession.accessMessage}
          accessState={hydratedSession.accessState}
          inviteId={hydratedSession.inviteId}
        />
      ) : (
        <div className="mx-auto max-w-[1400px] px-6 md:px-12">
          <InviteLobby
            candidateName={participantName}
            connectionError={connectionError}
            initialSnapshot={hydratedSession}
            isBootstrapping={isBootstrapping}
            onSubmit={handlePreJoinSubmit}
          />
        </div>
      )}
    </div>
  )
}
