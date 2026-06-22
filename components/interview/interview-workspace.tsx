'use client'

import dynamic from 'next/dynamic'
import { type LocalUserChoices } from '@livekit/components-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { useMutation, useQuery } from 'convex/react'
import { type DisconnectReason, Room } from 'livekit-client'
import { useStore } from 'zustand'
import { type StoreApi } from 'zustand/vanilla'
import { useShallow } from 'zustand/react/shallow'

import { api } from '@/convex/_generated/api'
import { InviteLobby } from '@/components/interview/invite-lobby'
import { InviteAccessScreen } from '@/components/interview/invite-access-screen'
import { MeetingShell } from '@/components/interview/meeting-shell'
import {
  createWorkspaceStore,
  type InterviewView,
  type WorkspaceState,
  type WorkspaceStore,
} from '@/components/interview/interview-workspace-store'
import { bootstrapInterviewSession } from '@/lib/interview/bootstrap'
import {
  createDiagnosticLogger,
  createRequestId,
} from '@/lib/interview/diagnostics'
import { createLocalEvent } from '@/lib/interview/room-event-utils'
import { mergeInterviewSnapshot } from '@/lib/interview/snapshot'
import { useInterviewRoomEvents } from '@/lib/interview/use-interview-room-events'
import { type InterviewSessionSnapshot } from '@/lib/interview/types'

function isAgentParticipant(identity: string) {
  return !identity.startsWith('candidate-')
}

function hasInterviewAgentJoined(
  room: Room,
  session: InterviewSessionSnapshot
) {
  for (const participant of room.remoteParticipants.values()) {
    if (isAgentParticipant(participant.identity)) {
      return true
    }
  }

  return (
    session.events.some((event) => event.type === 'agent-speaking') ||
    session.transcript.some((segment) => segment.speaker === 'agent')
  )
}

const AGENT_JOIN_TIMEOUT_MS = 90_000

const InterviewProcessingSuccess = dynamic(
  () =>
    import('@/components/interview/interview-processing-success').then(
      (mod) => mod.InterviewProcessingSuccess
    ),
  { ssr: false }
)

type InterviewWorkspaceProps = {
  initialSnapshot: InterviewSessionSnapshot
}

export function InterviewWorkspace({
  initialSnapshot,
}: InterviewWorkspaceProps) {
  const [requestId] = useState(() => createRequestId('client'))
  const storeRef = useRef<StoreApi<WorkspaceStore>>(null)
  if (storeRef.current === null) {
    storeRef.current = createWorkspaceStore(initialSnapshot)
  }
  const store = storeRef.current
  const {
    view,
    session,
    participantName,
    preJoinChoices,
    bootstrappedSession,
    connectionError,
    isBootstrapping,
    isSubmittingInterview,
    agentJoinTimedOut,
  } = useStore(
    store,
    useShallow((state) => ({
      view: state.view,
      session: state.session,
      participantName: state.participantName,
      preJoinChoices: state.preJoinChoices,
      bootstrappedSession: state.bootstrappedSession,
      connectionError: state.connectionError,
      isBootstrapping: state.isBootstrapping,
      isSubmittingInterview: state.isSubmittingInterview,
      agentJoinTimedOut: state.agentJoinTimedOut,
    }))
  )

  const patchWorkspace = useCallback(
    (patch: Partial<WorkspaceState>) => store.getState().patch(patch),
    [store]
  )
  const setSession = useCallback<
    Dispatch<SetStateAction<InterviewSessionSnapshot>>
  >((updater) => store.getState().updateSession(updater), [store])
  const setView = useCallback<Dispatch<SetStateAction<InterviewView>>>(
    (updater) =>
      store.getState().patch((state) => ({
        view: typeof updater === 'function' ? updater(state.view) : updater,
      })),
    [store]
  )
  const setConnectionError = useCallback<
    Dispatch<SetStateAction<string | null>>
  >(
    (updater) =>
      store.getState().patch((state) => ({
        connectionError:
          typeof updater === 'function'
            ? updater(state.connectionError)
            : updater,
      })),
    [store]
  )
  const setBootstrappedSession = useCallback<
    Dispatch<SetStateAction<WorkspaceState['bootstrappedSession']>>
  >(
    (updater) =>
      store.getState().patch((state) => ({
        bootstrappedSession:
          typeof updater === 'function'
            ? updater(state.bootstrappedSession)
            : updater,
      })),
    [store]
  )
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
  const sessionStateRef = useRef<InterviewSessionSnapshot['state']>(
    initialSnapshot.state
  )
  const participantNameRef = useRef(participantName)
  const appendSessionEvent = useMutation(
    api.interviews.sessionEvents.appendSessionEvent
  )
  const upsertTranscriptSegment = useMutation(
    api.interviews.transcript.upsertTranscriptSegment
  )
  const persistedSession = useQuery(
    api.interviews.public.getPublicSessionDetail,
    {
      inviteToken: initialSnapshot.inviteId,
    }
  )

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
    sessionStateRef.current = session.state
  }, [session.state])

  useEffect(() => {
    participantNameRef.current = participantName
  }, [participantName])

  useEffect(() => {
    if (view !== 'meeting') {
      return
    }

    const checkInterval = window.setInterval(() => {
      if (hasInterviewAgentJoined(room, hydratedSession)) {
        patchWorkspace({ agentJoinTimedOut: false })
      }
    }, 2000)

    const timeoutId = window.setTimeout(() => {
      if (!hasInterviewAgentJoined(room, hydratedSession)) {
        patchWorkspace({ agentJoinTimedOut: true })
        logger.warn({
          event: 'agent.join.timeout',
          detail:
            'Interviewer agent did not join the room within the expected window.',
          sessionId: sessionIdRef.current ?? undefined,
          roomName: roomNameRef.current ?? undefined,
        })
      }
    }, AGENT_JOIN_TIMEOUT_MS)

    return () => {
      window.clearInterval(checkInterval)
      window.clearTimeout(timeoutId)
    }
  }, [hydratedSession, logger, patchWorkspace, room, view])

  useEffect(() => {
    if (view !== 'meeting' || hydratedSession.state !== 'processing') {
      return
    }

    completionRequestedRef.current = true

    void (async () => {
      await room.disconnect(true).catch(() => null)
      patchWorkspace({
        bootstrappedSession: null,
        view: 'processing',
      })
    })()
  }, [hydratedSession.state, patchWorkspace, room, view])

  useInterviewRoomEvents({
    room,
    inviteToken: initialSnapshot.inviteId,
    logger,
    appendSessionEvent,
    upsertTranscriptSegment,
    sessionIdRef,
    roomNameRef,
    sessionStateRef,
    completionRequestedRef,
    lastFinalSegmentRef,
    setSession,
    setConnectionError,
    setView,
    setBootstrappedSession,
  })

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
      inviteToken: initialSnapshot.inviteId,
      sessionId: sessionIdRef.current as never,
      type,
      detail,
      dedupeKey: `${type}:${sessionIdRef.current}:${detail.slice(0, 64)}`,
      state,
    }).catch(() => null)
  }

  async function handlePreJoinSubmit(choices: LocalUserChoices) {
    const candidateName = choices.username.trim() || participantName

    setConnectionError(null)
    patchWorkspace({
      isBootstrapping: true,
      preJoinChoices: choices,
      participantName: candidateName,
    })
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
      patchWorkspace({ isBootstrapping: false })
    }
  }

  async function handleRoomConnected() {
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
    patchWorkspace({ isSubmittingInterview: true })
    setConnectionError(null)
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
            inviteToken: initialSnapshot.inviteId,
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
      setView('meeting')
      logger.error({
        event: 'session.processing.failed',
        detail: message,
        sessionId: sessionIdRef.current ?? undefined,
        roomName: roomNameRef.current ?? undefined,
        participantIdentity: participantNameRef.current,
        error,
      })
    } finally {
      patchWorkspace({ isSubmittingInterview: false })
    }
  }

  async function handleRetryAgentConnection() {
    patchWorkspace({
      agentJoinTimedOut: false,
      preJoinChoices: null,
      view: 'prejoin',
      connectionError:
        'The interviewer did not join in time. Check your connection and try again.',
      bootstrappedSession: null,
    })
    await room.disconnect(true)
  }

  return (
    <div className="h-full w-full">
      {view === 'meeting' && bootstrappedSession && preJoinChoices ? (
        <MeetingShell
          agentJoinTimedOut={agentJoinTimedOut}
          connectionError={connectionError}
          isSubmittingInterview={isSubmittingInterview}
          onConnected={handleRoomConnected}
          onDisconnected={handleRoomDisconnected}
          onError={handleRoomError}
          onRetryAgentConnection={() => void handleRetryAgentConnection()}
          onSubmitInterview={handleSubmitInterview}
          policy={hydratedSession.policy}
          preJoinChoices={preJoinChoices}
          room={room}
          session={bootstrappedSession}
          transcript={hydratedSession.transcript}
        />
      ) : view === 'processing' ? (
        <InterviewProcessingSuccess
          connectionError={connectionError}
          onRetrySubmission={handleSubmitInterview}
        />
      ) : hydratedSession.accessState !== 'available' ? (
        <InviteAccessScreen
          accessMessage={hydratedSession.accessMessage}
          accessState={hydratedSession.accessState}
          inviteId={hydratedSession.inviteId}
        />
      ) : (
        <div className="mx-auto w-full max-w-[1400px]">
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
