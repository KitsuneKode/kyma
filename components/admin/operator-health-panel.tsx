import {
  collectPlatformHealthChecks,
  summarizeHealth,
  type HealthCheckStatus,
} from '@/lib/ops/platform-health'
import { WorkspaceSurface } from '@/components/workspace/surface'
import { cn } from '@/lib/utils'

function statusLabel(status: HealthCheckStatus) {
  switch (status) {
    case 'ok':
      return 'Ready'
    case 'warn':
      return 'Warning'
    case 'error':
      return 'Blocked'
    default:
      return 'Unknown'
  }
}

function statusClass(status: HealthCheckStatus) {
  switch (status) {
    case 'ok':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
    case 'warn':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
    case 'error':
      return 'bg-destructive/10 text-destructive'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function OperatorHealthPanel() {
  const checks = collectPlatformHealthChecks()
  const summary = summarizeHealth(checks)

  return (
    <div className="space-y-6">
      <WorkspaceSurface className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Platform readiness</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Environment checks for interview, processing, and recruiter
              workflows. Resolve errors before production launch.
            </p>
          </div>
          <div
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium',
              summary.ready
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'bg-destructive/10 text-destructive'
            )}
          >
            {summary.ready
              ? 'Launch-ready (no blockers)'
              : `${summary.errors} blocker(s), ${summary.warnings} warning(s)`}
          </div>
        </div>
      </WorkspaceSurface>

      <WorkspaceSurface className="divide-y divide-border/60">
        {checks.map((check) => (
          <div
            key={check.id}
            className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <p className="font-medium">{check.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {check.detail}
              </p>
            </div>
            <span
              className={cn(
                'inline-flex w-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                statusClass(check.status)
              )}
            >
              {statusLabel(check.status)}
            </span>
          </div>
        ))}
      </WorkspaceSurface>

      <WorkspaceSurface className="space-y-3 p-6 text-sm text-muted-foreground">
        <h3 className="font-medium text-foreground">Launch bar checklist</h3>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Recruiter signs in with Clerk and selects an organization.</li>
          <li>Create a screening batch and open a generated invite.</li>
          <li>
            Run <code className="rounded bg-muted px-1">bun run dev:full</code>{' '}
            and complete a live interview with the agent worker.
          </li>
          <li>
            Submit interview and confirm report + evidence on recruiter review.
          </li>
          <li>
            Verify Inngest processing or inline fallback completes visibly.
          </li>
        </ol>
      </WorkspaceSurface>
    </div>
  )
}
