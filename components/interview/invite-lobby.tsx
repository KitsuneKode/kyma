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
    <div className="grid min-h-[calc(100vh-8rem)] w-full items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
      {/* Left: Video Preview Area */}
      <section className="relative flex h-full flex-col justify-center">
        <div className="relative overflow-hidden rounded-3xl bg-card p-4 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] ring-1 ring-border/50">
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
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-background/50 backdrop-blur-md transition-all duration-300">
              <div className="rounded-2xl bg-card px-5 py-3 text-sm font-medium shadow-lg ring-1 ring-border">
                Preparing interview…
              </div>
            </div>
          ) : null}
        </div>

        {connectionError ? (
          <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {connectionError}
          </div>
        ) : null}
      </section>

      {/* Right: Sleek Typography and Details */}
      <section className="flex h-full flex-col justify-center pb-8 lg:pb-0">
        <div className="mb-12">
          <Logo className="h-8 w-auto" />
        </div>

        <div className="space-y-8">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              {companyName ? `${companyName} Interview` : 'Kyma Interview'}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Ready to join?
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-pretty text-muted-foreground">
              This session includes a short setup check and a live voice
              conversation.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-muted/40 p-5 ring-1 ring-border/50">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  Duration
                </p>
                <TooltipProvider delay={100}>
                  <Tooltip>
                    <TooltipTrigger className="flex cursor-pointer items-center justify-center border-none bg-transparent p-0 text-muted-foreground transition-colors hover:text-foreground">
                      <IconInfoCircle className="h-3.5 w-3.5" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      {initialSnapshot.policy.allowsResume
                        ? 'Resume is supported until the interview is submitted.'
                        : 'This interview is single-pass once it starts.'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="mt-2 text-lg font-medium tabular-nums">
                {formatDurationPolicy(initialSnapshot.policy)}
              </p>
            </div>

            <div className="rounded-2xl bg-muted/40 p-5 ring-1 ring-border/50">
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                Valid Until
              </p>
              <p className="mt-2 text-lg font-medium text-pretty tabular-nums">
                {formatExpiryLabel(initialSnapshot.policy.expiresAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-primary/5 p-4 text-sm text-primary ring-1 ring-primary/10">
            <IconInfoCircle className="h-4 w-4 shrink-0" />
            <p>
              Please confirm your camera and microphone are working in the
              preview before joining.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
