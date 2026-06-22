'use client'

import { AnimatePresence, motion } from 'motion/react'
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconRewindBackward10,
  IconVolume,
  IconVolume3,
} from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { formatTime } from '@/lib/format/time'
import { cn } from '@/lib/utils'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { useReviewContext } from '@/components/recruiter/review-context'

export function ReviewConsolePlayback() {
  const { audioUrl, playback } = useReviewContext()
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    rateTransitioning,
    audioRef,
    togglePlay,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleSeek,
    toggleMute,
    handleVolumeChange,
    jumpToTime,
    cyclePlaybackRate,
    stopPlayback,
    playedPct,
  } = playback

  return (
    <WorkspaceSurface className="p-4">
      {audioUrl ? (
        <>
          <audio
            ref={audioRef}
            src={audioUrl}
            aria-label="Interview recording playback"
            onEnded={stopPlayback}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            className="hidden"
          />
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
                {formatTime(currentTime)}
              </span>
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-0 flex items-center">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
                    <div
                      className="h-full rounded-full bg-primary/40 transition-[width] duration-100"
                      style={{ width: `${playedPct}%` }}
                    />
                  </div>
                </div>
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="relative cursor-pointer"
                />
              </div>
              <span className="w-10 font-mono text-[11px] text-muted-foreground tabular-nums">
                {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl">
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => jumpToTime(Math.max(0, currentTime - 10))}
                  className="rounded-full"
                >
                  <IconRewindBackward10 className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  onClick={togglePlay}
                  className="size-9 rounded-full"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={isPlaying ? 'pause' : 'play'}
                      initial={{ opacity: 0, filter: 'blur(2px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, filter: 'blur(2px)' }}
                      transition={{ duration: 0.16 }}
                      className="flex items-center justify-center"
                    >
                      {isPlaying ? (
                        <IconPlayerPause className="size-4" />
                      ) : (
                        <IconPlayerPlay className="ml-0.5 size-4" />
                      )}
                    </motion.span>
                  </AnimatePresence>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cyclePlaybackRate}
                  className={cn(
                    'rounded-full px-2.5 font-mono text-xs tabular-nums transition-[opacity,filter] duration-100',
                    rateTransitioning && 'opacity-50 blur-[1px]'
                  )}
                >
                  {playbackRate}x
                </Button>
              </div>

              <div className="hidden items-center gap-1.5 sm:flex">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleMute}
                  className="rounded-full"
                >
                  {isMuted || volume === 0 ? (
                    <IconVolume3 className="size-3.5" />
                  ) : (
                    <IconVolume className="size-3.5" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="w-20 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-14 items-center justify-center rounded-2xl bg-muted/15">
          <p className="text-sm text-muted-foreground">
            No audio recording available.
          </p>
        </div>
      )}
    </WorkspaceSurface>
  )
}
