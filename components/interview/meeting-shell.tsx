"use client"

import {
  ConnectionStateToast,
  ControlBar,
  GridLayout,
  LayoutContextProvider,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  type LocalUserChoices,
  useCreateLayoutContext,
  useTracks,
} from "@livekit/components-react"
import { Track, type DisconnectReason, type Room } from "livekit-client"

import { Button } from "@/components/ui/button"
import { formatDurationPolicy } from "@/lib/interview/policy"
import { type BootstrappedInterviewSession } from "@/lib/interview/bootstrap"
import { type InterviewPolicy } from "@/lib/interview/types"

type MeetingShellProps = {
  connectionError: string | null
  isSubmittingInterview: boolean
  onConnected: () => void
  onDisconnected?: (reason?: DisconnectReason) => void
  onError: (error: Error) => void
  onSubmitInterview: () => void | Promise<void>
  policy: InterviewPolicy
  preJoinChoices: LocalUserChoices
  room: Room
  session: BootstrappedInterviewSession
}

function InterviewConference() {
  const layoutContext = useCreateLayoutContext()
  const tracks = useTracks(
    [
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Camera, withPlaceholder: true },
    ],
    {
      onlySubscribed: false,
    }
  )

  return (
    <div className="lk-video-conference h-full">
      <LayoutContextProvider value={layoutContext}>
        <div className="lk-video-conference-inner">
          <div className="lk-grid-layout-wrapper">
            <GridLayout tracks={tracks} className="h-full">
              <ParticipantTile />
            </GridLayout>
          </div>
          <ControlBar
            controls={{
              microphone: true,
              camera: true,
              screenShare: true,
              chat: false,
              settings: false,
              leave: false,
            }}
            saveUserChoices={false}
          />
        </div>
      </LayoutContextProvider>
      <RoomAudioRenderer />
      <ConnectionStateToast />
    </div>
  )
}

export function MeetingShell({
  connectionError,
  isSubmittingInterview,
  onConnected,
  onDisconnected,
  onError,
  onSubmitInterview,
  policy,
  preJoinChoices,
  room,
  session,
}: MeetingShellProps) {
  return (
    <div className="kyma-meeting-shell rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/70 px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Live Interview
          </p>
          <p className="mt-1 text-sm font-medium">
            Submit the interview when the conversation is complete. If the
            built-in leave control is used first, the session will be marked as
            interrupted.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDurationPolicy(policy)}. Single-use invite. Resume is
            available only until the interview is submitted.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            When the interviewer switches into the teaching simulation, you can
            optionally share your screen to teach with Excalidraw, slides, or a
            sketch pad.
          </p>
        </div>
        <Button onClick={onSubmitInterview} disabled={isSubmittingInterview}>
          {isSubmittingInterview ? "Submitting..." : "Submit Interview"}
        </Button>
      </div>

      <div
        data-lk-theme="default"
        className="overflow-hidden rounded-2xl border border-border/80 bg-background shadow-sm"
      >
        <LiveKitRoom
          room={room}
          token={session.token}
          serverUrl={session.wsUrl}
          connect
          audio={
            preJoinChoices.audioEnabled
              ? {
                  deviceId: preJoinChoices.audioDeviceId || "default",
                }
              : false
          }
          video={
            preJoinChoices.videoEnabled
              ? {
                  deviceId: preJoinChoices.videoDeviceId || "default",
                }
              : false
          }
          onConnected={onConnected}
          onDisconnected={onDisconnected}
          onError={onError}
          className="h-[720px]"
        >
          <InterviewConference />
        </LiveKitRoom>
      </div>

      {connectionError ? (
        <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {connectionError}
        </div>
      ) : null}
    </div>
  )
}
