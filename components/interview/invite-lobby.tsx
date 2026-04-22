'use client'

import { PreJoin, type LocalUserChoices } from '@livekit/components-react'

import { formatDurationPolicy, formatExpiryLabel } from '@/lib/interview/policy'
import { type InterviewSessionSnapshot } from '@/lib/interview/types'

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
  const prejoinHeader = companyName
    ? `${companyName} interview on Kyma`
    : 'Kyma Interview'

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-2xl bg-card/90 p-6 shadow-sm">
        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          {prejoinHeader}
        </p>
        <h1 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-balance">
          Join your scheduled interview session.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-pretty text-muted-foreground">
          This session includes a short setup check, a live voice conversation,
          and final submission for recruiter review. Most interviews finish
          within {formatDurationPolicy(initialSnapshot.policy).toLowerCase()}.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-background/70 p-4 shadow-sm">
            <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
              Invite
            </p>
            <p className="mt-2 font-medium">{initialSnapshot.inviteId}</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-background/70 p-4 shadow-sm">
            <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
              Template
            </p>
            <p className="mt-2 font-medium">
              {initialSnapshot.templateName || 'Interview Session'}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-background/70 p-5 shadow-sm">
          <p className="text-sm font-semibold">What to expect</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            <li>Confirm your camera and microphone, then join the room.</li>
            <li>Complete the interview in one sitting if possible.</li>
            <li>Submit your interview so the recruiter can review it.</li>
          </ul>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-background/70 p-4 shadow-sm">
            <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
              Interview policy
            </p>
            <p className="mt-2 font-medium">
              {formatDurationPolicy(initialSnapshot.policy)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {initialSnapshot.policy.allowsResume
                ? 'Resume is supported until the interview is submitted.'
                : 'This interview is single-pass once it starts.'}
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-background/70 p-4 shadow-sm">
            <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
              Link validity
            </p>
            <p className="mt-2 font-medium">
              {formatExpiryLabel(initialSnapshot.policy.expiresAt)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Single-use invite. Re-entry is allowed only for the same active
              session.
            </p>
          </div>
        </div>
      </section>

      <section className="relative rounded-2xl bg-card/90 p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Prejoin
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Check your setup before joining
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Choose your devices, preview media, and join when you are ready.
          </p>
        </div>

        <div className="rounded-2xl bg-background/80 p-4 shadow-sm">
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
        </div>

        {connectionError ? (
          <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {connectionError}
          </div>
        ) : null}

        {isBootstrapping ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/70 backdrop-blur-sm">
            <div className="rounded-2xl bg-card px-4 py-3 text-sm font-medium shadow-sm">
              Preparing interview…
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
