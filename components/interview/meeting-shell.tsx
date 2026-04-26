'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ConnectionStateToast,
  GridLayout,
  LayoutContextProvider,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  type LocalUserChoices,
  useCreateLayoutContext,
  useTracks,
  RoomName,
  TrackToggle,
} from '@livekit/components-react'
import { Track, type DisconnectReason, type Room } from 'livekit-client'
import { IconBuildingSkyscraper } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { type BootstrappedInterviewSession } from '@/lib/interview/bootstrap'
import { type InterviewPolicy } from '@/lib/interview/types'

type MeetingShellProps = {
  connectionError: string | null
  isSubmittingInterview: boolean
  onConnected: () => void
  onDisconnected?: (reason?: DisconnectReason) => void
  onError: (error: Error) => void
  onSubmitInterview: () => void | Promise<void>
  policy?: InterviewPolicy
  preJoinChoices: LocalUserChoices
  room: Room
  session: BootstrappedInterviewSession
}

function InterviewConference({
  isSubmitting,
  onSubmit,
  templateName,
}: {
  isSubmitting: boolean
  onSubmit: () => void | Promise<void>
  templateName?: string
}) {
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

  const [isIdle, setIsIdle] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    const resetIdle = () => {
      setIsIdle(false)
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => setIsIdle(true), 3000)
    }

    window.addEventListener('mousemove', resetIdle)
    window.addEventListener('keydown', resetIdle)
    window.addEventListener('touchstart', resetIdle)

    timeoutId = setTimeout(() => setIsIdle(true), 3000)

    return () => {
      window.removeEventListener('mousemove', resetIdle)
      window.removeEventListener('keydown', resetIdle)
      window.removeEventListener('touchstart', resetIdle)
      clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    const startedAt = Date.now()
    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')
  const seconds = String(elapsedSeconds % 60).padStart(2, '0')

  return (
    <div className="lk-video-conference relative h-[100dvh] w-full overflow-hidden bg-[#0a0a0a]">
      <LayoutContextProvider value={layoutContext}>
        <div className="lk-video-conference-inner relative flex h-full w-full flex-col">
          {/* Top Bar for branding and room info */}
          <AnimatePresence>
            {!isIdle && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="absolute top-0 right-0 left-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/40 to-transparent px-6 pt-6 pb-12"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
                    <IconBuildingSkyscraper className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold tracking-tight text-white drop-shadow-sm">
                      {templateName || 'Interview Session'}
                    </span>
                    <RoomName className="text-xs font-medium text-white/70 drop-shadow-sm" />
                  </div>
                </div>
                <div className="rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-white/80 tabular-nums shadow-[0_0_0_1px_rgba(255,255,255,0.14)]">
                  {minutes}:{seconds}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="lk-grid-layout-wrapper h-full w-full bg-[#0a0a0a] [&_.lk-grid-layout]:gap-0 [&_.lk-grid-layout]:p-0 [&_.lk-participant-tile]:rounded-none [&_.lk-participant-tile]:border-none [&_video]:object-cover">
            <GridLayout tracks={tracks} className="h-full w-full">
              <ParticipantTile />
            </GridLayout>
          </div>

          {/* Bottom control bar wrapper */}
          <AnimatePresence>
            {!isIdle && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.14),0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
              >
                <div className="lk-control-bar flex items-center gap-1 !border-none !bg-transparent !p-0 !shadow-none">
                  <TrackToggle
                    source={Track.Source.Microphone}
                    showIcon={true}
                  />
                  <TrackToggle source={Track.Source.Camera} showIcon={true} />
                  <TrackToggle
                    source={Track.Source.ScreenShare}
                    showIcon={true}
                  />
                </div>

                <div className="mx-1 h-6 w-px bg-white/20" />

                <Button
                  onClick={onSubmit}
                  disabled={isSubmitting}
                  className="rounded-full bg-primary px-6 font-medium text-primary-foreground shadow-[0_0_0_1px_rgba(232,255,71,0.45),0_10px_30px_rgba(0,0,0,0.35)] transition-colors hover:bg-primary/90"
                >
                  {isSubmitting ? 'Submitting…' : 'Submit & Leave'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
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
  preJoinChoices,
  room,
  session,
}: MeetingShellProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <div data-lk-theme="default" className="h-full w-full">
        <LiveKitRoom
          room={room}
          token={session.token}
          serverUrl={session.wsUrl}
          connect
          audio={
            preJoinChoices.audioEnabled
              ? {
                  deviceId: preJoinChoices.audioDeviceId || 'default',
                }
              : false
          }
          video={
            preJoinChoices.videoEnabled
              ? {
                  deviceId: preJoinChoices.videoDeviceId || 'default',
                }
              : false
          }
          onConnected={onConnected}
          onDisconnected={onDisconnected}
          onError={onError}
          className="h-full w-full"
        >
          <InterviewConference
            isSubmitting={isSubmittingInterview}
            onSubmit={onSubmitInterview}
            templateName={session.templateName}
          />
        </LiveKitRoom>
      </div>

      {connectionError ? (
        <div className="absolute top-24 left-1/2 z-[110] -translate-x-1/2 rounded-2xl border border-destructive/20 bg-destructive/90 px-6 py-4 text-sm text-white shadow-2xl backdrop-blur-md">
          {connectionError}
        </div>
      ) : null}
    </div>
  )
}
