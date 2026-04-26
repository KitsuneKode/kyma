'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'

import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'

type ReadinessChecks = {
  browserSupported: boolean
  audioInputAvailable: boolean
  videoInputAvailable: boolean
  networkOnline: boolean
  secureContext: boolean
  mediaPermissionsGranted: boolean
}

async function runChecks(): Promise<ReadinessChecks> {
  const browserSupported =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  const networkOnline =
    typeof navigator !== 'undefined' ? navigator.onLine : false
  const secureContext =
    typeof window !== 'undefined' ? window.isSecureContext : false

  let audioInputAvailable = false
  let videoInputAvailable = false
  let mediaPermissionsGranted = false

  if (browserSupported) {
    const devices = await navigator.mediaDevices.enumerateDevices()
    audioInputAvailable = devices.some((device) => device.kind === 'audioinput')
    videoInputAvailable = devices.some((device) => device.kind === 'videoinput')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      })
      mediaPermissionsGranted = true
      stream.getTracks().forEach((track) => track.stop())
    } catch {
      mediaPermissionsGranted = false
    }
  }

  return {
    browserSupported,
    audioInputAvailable,
    videoInputAvailable,
    networkOnline,
    secureContext,
    mediaPermissionsGranted,
  }
}

export function CandidateReadinessPanel() {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveRun = useMutation(api.readiness.saveCandidateReadinessRun)
  const runs = useQuery(api.readiness.getCandidateReadinessRuns)

  const latest = runs?.[0] ?? null
  const latestScore = useMemo(() => {
    if (!latest) {
      return null
    }
    return Object.values(latest.checks).filter(Boolean).length
  }, [latest])

  async function handleRunReadiness() {
    setRunning(true)
    setError(null)
    try {
      const checks = await runChecks()
      await saveRun({
        checks,
        notes: checks.mediaPermissionsGranted
          ? 'Ready for interview'
          : 'Grant microphone/camera access and retry',
      })
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to run readiness checks right now.'
      )
    } finally {
      setRunning(false)
    }
  }

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Interview readiness</h1>
        <p className="text-sm text-muted-foreground">
          Run microphone, camera, browser, and network checks before live
          interviews.
        </p>
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Latest run</p>
            {latest ? (
              <p className="text-sm text-muted-foreground">
                {latestScore}/6 checks passing,{' '}
                {new Date(latest.ranAt).toLocaleString()}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No readiness runs yet.
              </p>
            )}
          </div>
          <Button onClick={handleRunReadiness} disabled={running}>
            {running ? 'Running checks...' : 'Run readiness checks'}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          History
        </h2>
        {!runs || runs.length === 0 ? (
          <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]">
            No readiness history yet.
          </p>
        ) : (
          <div className="space-y-2">
            {runs.slice(0, 5).map((run) => (
              <article
                key={`${run._id}`}
                className="rounded-2xl bg-card p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.2)]"
              >
                <p className="text-sm font-medium">
                  {new Date(run.ranAt).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {run.notes}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
