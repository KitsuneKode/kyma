'use client'

import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useMemo, useState } from 'react'
import { PreJoin, type LocalUserChoices } from '@livekit/components-react'

import { api } from '@/convex/_generated/api'
import {
  formatDurationPolicy,
  formatExpiryRelative,
} from '@/lib/interview/policy'
import { type InterviewSessionSnapshot } from '@/lib/interview/types'
import {
  countPassingReadinessChecks,
  isReadinessPassing,
  runReadinessChecks,
  type ReadinessChecks,
} from '@/lib/candidate/readiness-checks'
import { ReadinessCheckList } from '@/components/candidate/readiness-check-list'
import { Logo } from '@/components/marketing/logo'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { IconInfoCircle } from '@tabler/icons-react'
import { WorkspaceSurface } from '@/components/workspace/surface'

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
  const { isSignedIn } = useAuth()
  const saveReadinessRun = useMutation(api.readiness.saveCandidateReadinessRun)
  const readinessRuns = useQuery(
    api.readiness.getCandidateReadinessRuns,
    isSignedIn ? {} : 'skip'
  )

  const companyName = initialSnapshot.templateName?.trim()
  const interviewLabel = companyName
    ? companyName.replace(/\s+default$/i, '')
    : 'Kyma'
  const [prejoinError, setPrejoinError] = useState<string | null>(null)
  const [gateError, setGateError] = useState<string | null>(null)
  const [recordingConsent, setRecordingConsent] = useState(false)
  const [runningChecks, setRunningChecks] = useState(false)
  const [inlineChecksPassing, setInlineChecksPassing] = useState(false)
  const [inlineScore, setInlineScore] = useState<number | null>(null)
  const [latestChecks, setLatestChecks] = useState<ReadinessChecks | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 30_000)

    return () => window.clearInterval(intervalId)
  }, [])

  const latestPersistedRun = readinessRuns?.[0] ?? null
  const persistedPassing = latestPersistedRun
    ? isReadinessPassing(latestPersistedRun.checks)
    : false
  const readinessPassed = persistedPassing || inlineChecksPassing
  const readinessScore = latestPersistedRun
    ? countPassingReadinessChecks(latestPersistedRun.checks)
    : inlineScore

  const joinBlockedReason = useMemo(() => {
    if (!readinessPassed) {
      return 'Complete the readiness checks before joining.'
    }
    if (!recordingConsent) {
      return 'Confirm recording consent before joining.'
    }
    return null
  }, [readinessPassed, recordingConsent])

  async function handleRunReadinessChecks() {
    setRunningChecks(true)
    setGateError(null)
    try {
      const checks = await runReadinessChecks()
      const passing = isReadinessPassing(checks)
      setLatestChecks(checks)
      setInlineChecksPassing(passing)
      setInlineScore(countPassingReadinessChecks(checks))
      if (isSignedIn) {
        await saveReadinessRun({
          checks,
          notes: passing
            ? 'Ready for interview'
            : 'Grant microphone/camera access and retry',
        })
      }
      if (!passing) {
        setGateError(
          'Some readiness checks failed. Grant microphone and camera access, then retry.'
        )
      }
    } catch (error) {
      setGateError(
        error instanceof Error
          ? error.message
          : 'Unable to run readiness checks right now.'
      )
    } finally {
      setRunningChecks(false)
    }
  }

  return (
    <div className="grid min-h-[100dvh] w-full items-center gap-10 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-10">
      <section className="relative flex h-full flex-col justify-center">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#000] p-4 shadow-2xl ring-1 ring-white/10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,hsla(0,0%,20%,0.2)_0,transparent_70%)]" />
          <div className="lk-theme-override lk-theme-override--interview">
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
              onSubmit={(choices) => {
                if (joinBlockedReason) {
                  setGateError(joinBlockedReason)
                  return
                }
                setGateError(null)
                void onSubmit({ ...choices, username: candidateName })
              }}
              onError={(error) => {
                setPrejoinError(
                  error instanceof Error && error.name === 'NotSupportedError'
                    ? 'Camera and microphone preview is not supported in this browser context. Try Chrome on HTTPS or localhost.'
                    : 'Unable to start the device preview. Check camera and microphone permissions.'
                )
              }}
            />
          </div>

          {isBootstrapping ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-background/60 backdrop-blur-md transition-all duration-300">
              <WorkspaceSurface
                as="div"
                className="animate-pulse rounded-2xl bg-card px-6 py-4 text-sm font-semibold ring-white/10"
              >
                Preparing interview…
              </WorkspaceSurface>
            </div>
          ) : null}
        </div>

        {connectionError ? (
          <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm font-medium text-destructive backdrop-blur-sm">
            {connectionError}
          </div>
        ) : null}

        {prejoinError ? (
          <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-4 text-sm font-medium text-amber-100 backdrop-blur-sm">
            {prejoinError}
          </div>
        ) : null}

        {gateError ? (
          <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-5 py-4 text-sm font-medium text-amber-100 backdrop-blur-sm">
            {gateError}
          </div>
        ) : null}
      </section>

      <section className="flex h-full flex-col justify-center pb-8 lg:pb-0">
        <div className="mb-8 lg:mb-12">
          <Logo className="h-8 w-auto text-primary" />
        </div>

        <div className="space-y-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
              <span className="flex size-2 animate-pulse rounded-full bg-primary" />
              <p className="text-xs font-semibold tracking-wider text-primary uppercase">
                {interviewLabel} interview
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

          <WorkspaceSurface
            as="div"
            className="rounded-2xl bg-card/80 p-5 ring-white/10"
          >
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Readiness gate
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {readinessPassed
                ? `Readiness checks passed${readinessScore !== null ? ` (${readinessScore}/6)` : ''}.`
                : 'Run microphone, camera, browser, and network checks before joining.'}
            </p>
            <Button
              type="button"
              className="mt-4"
              variant={readinessPassed ? 'outline' : 'default'}
              disabled={runningChecks}
              onClick={() => void handleRunReadinessChecks()}
            >
              {runningChecks
                ? 'Running checks…'
                : readinessPassed
                  ? 'Re-run readiness checks'
                  : 'Run readiness checks'}
            </Button>
            {latestChecks || latestPersistedRun ? (
              <ReadinessCheckList
                checks={latestChecks ?? latestPersistedRun?.checks}
                className="mt-4"
              />
            ) : null}
          </WorkspaceSurface>

          <WorkspaceSurface
            as="div"
            className="flex items-start gap-3 rounded-2xl bg-card/80 p-5 ring-white/10"
          >
            <Checkbox
              id="recording-consent"
              checked={recordingConsent}
              onCheckedChange={(checked) =>
                setRecordingConsent(checked === true)
              }
              className="mt-0.5"
            />
            <label
              htmlFor="recording-consent"
              className="text-sm leading-relaxed text-muted-foreground"
            >
              I understand this interview may be recorded for assessment and
              quality review.
            </label>
          </WorkspaceSurface>

          <WorkspaceSurface
            as="div"
            className="rounded-2xl bg-card/80 p-5 ring-white/10"
          >
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Next step
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Confirm your mic and camera on the left, complete readiness
              checks, accept recording consent, then press the lime{' '}
              <span className="font-medium text-primary">Join interview</span>{' '}
              button to start the live interview.
            </p>
          </WorkspaceSurface>

          <div className="grid gap-4 sm:grid-cols-2">
            <WorkspaceSurface
              as="div"
              className="rounded-2xl p-6 ring-white/10 transition-colors hover:bg-muted/20"
            >
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
              <p className="mt-2 text-xs text-muted-foreground">
                {initialSnapshot.policy.allowsResume
                  ? 'Resume supported until you submit the interview.'
                  : 'Single-pass interview — no resume once started.'}
              </p>
            </WorkspaceSurface>

            <WorkspaceSurface
              as="div"
              className="rounded-2xl p-6 ring-white/10 transition-colors hover:bg-muted/20"
            >
              <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Attempts
              </p>
              <p className="mt-3 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {initialSnapshot.policy.maxAttempts === 1
                  ? '1 attempt'
                  : `${initialSnapshot.policy.maxAttempts} attempts`}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {initialSnapshot.policy.allowsResume
                  ? 'You can reconnect and continue within an attempt until you submit.'
                  : 'Each attempt is single-pass — finishing or leaving ends that attempt.'}
              </p>
            </WorkspaceSurface>

            <WorkspaceSurface
              as="div"
              className="rounded-2xl p-6 ring-white/10 transition-colors hover:bg-muted/20 sm:col-span-2"
            >
              <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Valid Until
              </p>
              <p className="mt-3 text-2xl font-bold tracking-tight text-pretty text-foreground tabular-nums">
                {formatExpiryRelative(initialSnapshot.policy.expiresAt, nowMs)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatExpiryRelative(
                  initialSnapshot.policy.expiresAt,
                  nowMs
                ) === 'Expired'
                  ? 'Request a new invite from your recruiter.'
                  : 'Invite window updates while you stay on this page.'}
              </p>
            </WorkspaceSurface>
          </div>

          <WorkspaceSurface
            as="div"
            className="flex items-center gap-4 rounded-2xl bg-muted/20 p-5 text-sm font-medium text-muted-foreground ring-white/10"
          >
            <IconInfoCircle className="h-5 w-5 shrink-0" />
            <p className="leading-relaxed">
              Please confirm your camera and microphone are working in the
              preview before joining.
            </p>
          </WorkspaceSurface>
        </div>
      </section>
    </div>
  )
}
