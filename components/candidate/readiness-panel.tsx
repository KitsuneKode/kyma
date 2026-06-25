'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'

import { api } from '@/convex/_generated/api'
import { ReadinessCheckList } from '@/components/candidate/readiness-check-list'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { WorkspacePageHeader } from '@/components/workspace/page-header'
import { WorkspaceSurface } from '@/components/workspace/surface'
import type { FunctionReturnType } from 'convex/server'
import {
  countPassingReadinessChecks,
  runReadinessChecks,
  type ReadinessChecks,
} from '@/lib/candidate/readiness-checks'
import { formatDateTime } from '@/lib/format/date'

type ReadinessRun = FunctionReturnType<
  typeof api.readiness.getCandidateReadinessRuns
>[number]

export function CandidateReadinessPanel({
  initialRuns = [],
}: {
  initialRuns?: ReadinessRun[]
}) {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [latestChecks, setLatestChecks] = useState<ReadinessChecks | null>(null)
  const liveRuns = useQuery(api.readiness.getCandidateReadinessRuns, {})
  const runs = liveRuns ?? initialRuns
  const saveRun = useMutation(api.readiness.saveCandidateReadinessRun)

  const latest = runs[0] ?? null
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
      setLatestChecks(checks)
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
    <section className="space-y-8">
      <WorkspacePageHeader
        eyebrow="Before you join"
        title="Interview readiness"
        description="Run microphone, camera, browser, and network checks before live interviews."
      />

      <WorkspaceSurface className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Latest run</p>
            {latest ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {latestScore}/6 checks passing, {formatDateTime(latest.ranAt)}
                </p>
                <Progress
                  value={((latestScore ?? 0) / 6) * 100}
                  className="max-w-xs"
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No readiness runs yet.
              </p>
            )}
          </div>
          <Button onClick={handleRunReadiness} disabled={running}>
            {running ? 'Running checks…' : 'Run readiness checks'}
          </Button>
        </div>
      </WorkspaceSurface>

      {latestChecks || latest ? (
        <WorkspaceSurface className="p-5">
          <p className="mb-3 text-sm font-medium">Check breakdown</p>
          <ReadinessCheckList checks={latestChecks ?? latest?.checks} />
        </WorkspaceSurface>
      ) : null}

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
          <WorkspaceSurface className="p-5 text-sm text-muted-foreground">
            No readiness history yet.
          </WorkspaceSurface>
        ) : (
          <div className="space-y-2">
            {runs.slice(0, 5).map((run) => (
              <WorkspaceSurface key={`${run._id}`} className="p-5">
                <p className="text-sm font-medium">
                  {formatDateTime(run.ranAt)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {run.notes}
                </p>
              </WorkspaceSurface>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
