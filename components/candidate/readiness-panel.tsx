'use client'

import { useMemo, useState } from 'react'
import { useMutation } from 'convex/react'

import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Surface } from '@/components/ui/surface'
import { useAuthenticatedQuery } from '@/lib/convex/use-authenticated-query'
import {
  countPassingReadinessChecks,
  runReadinessChecks,
} from '@/lib/candidate/readiness-checks'
import { formatDateTime } from '@/lib/format/date'

export function CandidateReadinessPanel() {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveRun = useMutation(api.readiness.saveCandidateReadinessRun)
  const { data: runs } = useAuthenticatedQuery(
    api.readiness.getCandidateReadinessRuns,
    {}
  )

  const latest = runs?.[0] ?? null
  const latestScore = useMemo(() => {
    if (!latest) {
      return null
    }
    return countPassingReadinessChecks(latest.checks)
  }, [latest])

  async function handleRunReadiness() {
    setRunning(true)
    setError(null)
    try {
      const checks = await runReadinessChecks()
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

      <Surface elevation="raised" padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Latest run</p>
            {latest ? (
              <p className="text-sm text-muted-foreground">
                {latestScore}/6 checks passing, {formatDateTime(latest.ranAt)}
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
      </Surface>

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
          <Surface padding="md" className="text-sm text-muted-foreground">
            No readiness history yet.
          </Surface>
        ) : (
          <div className="space-y-2">
            {runs.slice(0, 5).map((run) => (
              <Surface key={`${run._id}`} padding="md">
                <p className="text-sm font-medium">
                  {formatDateTime(run.ranAt)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {run.notes}
                </p>
              </Surface>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
