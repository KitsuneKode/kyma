'use client'

import { PreJoin, type LocalUserChoices } from '@livekit/components-react'

import { formatDurationPolicy, formatExpiryLabel } from '@/lib/interview/policy'
import { type InterviewSessionSnapshot } from '@/lib/interview/types'
import { Logo } from '@/components/marketing/logo'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { IconInfoCircle } from '@tabler/icons-react'

type InviteLobbyProps = {
  candidateName: string
  connectionError: string | null
  initialSnapshot: InterviewSessionSnapshot
  isBootstrapping: boolean
  onSubmit: (choices: LocalUserChoices) => void | Promise<void>
}

export function InviteLobby({
  candidateName,
  connectionError,
  initialSnapshot,
  isBootstrapping,
  onSubmit,
}: InviteLobbyProps) {
  const companyName = initialSnapshot.templateName?.trim()

  return (
    <div className="grid min-h-[100dvh] w-full items-center gap-10 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-10">
      {/* Left: Video Preview Area */}
      <section className="relative flex h-full flex-col justify-center">
        <div className="relative overflow-hidden rounded-3xl bg-card/90 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
          <div className="pointer-events-none absolute -top-20 -left-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute right-0 bottom-0 h-56 w-56 rounded-full bg-primary/5 blur-3xl" />
          <PreJoin
            defaults={{
              username: candidateName,
              audioEnabled: true,
              videoEnabled: true,
            }}
            joinLabel={
              isBootstrapping ? 'Preparing interview…' : 'Join interview'
            }
            userLabel="Candidate name"
            persistUserChoices={false}
            onSubmit={onSubmit}
            onError={(error) => {
              console.error('[kyma:prejoin] prejoin.error', error)
            }}
          />

          {isBootstrapping ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-background/60 backdrop-blur-md transition-all duration-300">
              <div className="animate-pulse rounded-2xl bg-card px-6 py-4 text-sm font-semibold shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_10px_30px_rgba(0,0,0,0.35)]">
                Preparing interview…
              </div>
            </div>
          ) : null}
        </div>

        {connectionError ? (
          <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm font-medium text-destructive backdrop-blur-sm">
            {connectionError}
          </div>
        ) : null}
      </section>

      {/* Right: Sleek Typography and Details */}
      <section className="flex h-full flex-col justify-center pb-8 lg:pb-0">
        <div className="mb-8 lg:mb-12">
          <Logo className="h-8 w-auto text-primary" />
        </div>

        <div className="space-y-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
              <span className="flex size-2 animate-pulse rounded-full bg-primary" />
              <p className="text-xs font-semibold tracking-wider text-primary uppercase">
                {companyName ? `${companyName} Interview` : 'Kyma Interview'}
              </p>
            </div>
            <h1 className="mt-2 text-5xl font-semibold tracking-tight text-balance antialiased sm:text-6xl lg:text-7xl">
              Ready to join?
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-pretty text-muted-foreground">
              This session includes a short setup check and a live voice
              conversation. Adjust your camera and microphone settings before
              entering.
            </p>
          </div>

          <div className="rounded-2xl bg-card/80 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Next step
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Confirm your mic and camera on the left, then press the lime{' '}
              <span className="font-medium text-primary">Join Call</span> button
              to start the live interview.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)] transition-colors hover:bg-muted/20">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  Duration
                </p>
                <TooltipProvider delay={100}>
                  <Tooltip>
                    <TooltipTrigger className="flex cursor-pointer items-center justify-center border-none bg-transparent p-0 text-muted-foreground transition-colors hover:text-foreground">
                      <IconInfoCircle className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs text-xs font-medium shadow-xl"
                    >
                      {initialSnapshot.policy.allowsResume
                        ? 'Resume is supported until the interview is submitted.'
                        : 'This interview is single-pass once it starts.'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {formatDurationPolicy(initialSnapshot.policy)}
              </p>
            </div>

            <div className="rounded-2xl bg-card p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)] transition-colors hover:bg-muted/20">
              <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Valid Until
              </p>
              <p className="mt-3 text-2xl font-bold tracking-tight text-pretty text-foreground tabular-nums">
                {formatExpiryLabel(initialSnapshot.policy.expiresAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl bg-muted/20 p-5 text-sm font-medium text-muted-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2)]">
            <IconInfoCircle className="h-5 w-5 shrink-0" />
            <p className="leading-relaxed">
              Please confirm your camera and microphone are working in the
              preview before joining.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
