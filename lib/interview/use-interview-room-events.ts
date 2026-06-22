'use client'

import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type Participant,
  type TrackPublication,
  type TranscriptionSegment,
} from 'livekit-client'

import type { createDiagnosticLogger } from '@/lib/interview/diagnostics'
import {
  createLocalEvent,
  getTranscriptSpeaker,
  summarizeTranscriptEvent,
  toIsoTimestamp,
  upsertLocalTranscriptSegment,
} from '@/lib/interview/room-event-utils'
import type { InterviewSessionSnapshot } from '@/lib/interview/types'
import type { BootstrappedInterviewSession } from '@/lib/interview/bootstrap'

type DiagnosticLogger = ReturnType<typeof createDiagnosticLogger>

type InterviewView = 'prejoin' | 'meeting' | 'processing'

type AppendSessionEvent = (args: {
  inviteToken: string
  sessionId: never
  type: string
  detail: string
  dedupeKey: string
  state?: InterviewSessionSnapshot['state']
}) => Promise<unknown>

type UseInterviewRoomEventsArgs = {
  room: Room
  inviteToken: string
  logger: DiagnosticLogger
  appendSessionEvent: AppendSessionEvent
  sessionIdRef: MutableRefObject<string | null>
  roomNameRef: MutableRefObject<string | null>
  sessionStateRef: MutableRefObject<InterviewSessionSnapshot['state']>
  completionRequestedRef: MutableRefObject<boolean>
  lastFinalSegmentRef: MutableRefObject<{
    speaker: InterviewSessionSnapshot['transcript'][number]['speaker']
    endedAtMs: number | null
  } | null>
  setSession: Dispatch<SetStateAction<InterviewSessionSnapshot>>
  setConnectionError: Dispatch<SetStateAction<string | null>>
  setView: Dispatch<SetStateAction<InterviewView>>
  setBootstrappedSession: Dispatch<
    SetStateAction<BootstrappedInterviewSession | null>
  >
}

export function useInterviewRoomEvents({
  room,
  inviteToken,
  logger,
  appendSessionEvent,
  sessionIdRef,
  roomNameRef,
  sessionStateRef,
  completionRequestedRef,
  lastFinalSegmentRef,
  setSession,
  setConnectionError,
  setView,
  setBootstrappedSession,
}: UseInterviewRoomEventsArgs) {
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
        inviteToken,
        sessionId: sessionIdRef.current as never,
        type,
        detail,
        dedupeKey: `${type}:${sessionIdRef.current}:${detail.slice(0, 64)}`,
        state,
      }).catch(() => null)
    }

    function handleParticipantConnected(
      participant: Room['remoteParticipants'] extends Map<string, infer Value>
        ? Value
        : never
    ) {
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
      void persistEffectEvent('candidate-screen-share-started', detail)
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
      void persistEffectEvent('candidate-screen-share-stopped', detail)
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
      void persistEffectEvent('reconnect-started', 'Room reconnect started.')
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
        'Room reconnect succeeded.'
      )
    }

    function handleConnectionStateChanged(state: ConnectionState) {
      if (
        state !== ConnectionState.Disconnected ||
        !sessionIdRef.current ||
        completionRequestedRef.current ||
        sessionStateRef.current !== 'reconnecting'
      ) {
        return
      }

      const message =
        'Live connection failed. Check your network and rejoin the interview.'

      setConnectionError(message)
      setSession((current) => ({
        ...current,
        state: 'interrupted',
        events: [
          ...current.events,
          createLocalEvent('reconnect-failed', message),
        ],
      }))
      void persistEffectEvent('reconnect-failed', message)
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
      setConnectionError(
        'The interview room disconnected. Rejoin when you are ready to continue.'
      )
      setSession((current) => ({
        ...current,
        state: 'interrupted',
        events: [
          ...current.events,
          createLocalEvent('participant-left', 'Room disconnected.'),
        ],
      }))
      void persistEffectEvent('participant-left', 'Room disconnected.')
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
    room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged)
    room.on(RoomEvent.Disconnected, handleDisconnected)
    room.on(RoomEvent.TranscriptionReceived, handleTranscriptionReceived)

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected)
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
      room.off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
      room.off(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished)
      room.off(RoomEvent.Reconnecting, handleReconnecting)
      room.off(RoomEvent.Reconnected, handleReconnected)
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChanged)
      room.off(RoomEvent.Disconnected, handleDisconnected)
      room.off(RoomEvent.TranscriptionReceived, handleTranscriptionReceived)
    }
  }, [
    appendSessionEvent,
    completionRequestedRef,
    inviteToken,
    lastFinalSegmentRef,
    logger,
    room,
    roomNameRef,
    sessionIdRef,
    sessionStateRef,
    setBootstrappedSession,
    setConnectionError,
    setSession,
    setView,
  ])
}
