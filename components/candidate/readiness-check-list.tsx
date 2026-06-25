import { READINESS_CHECK_ROWS } from '@/lib/candidate/readiness-labels'
import type { ReadinessChecks } from '@/lib/candidate/readiness-checks'
import { cn } from '@/lib/utils'

export function ReadinessCheckList({
  checks,
  className,
}: {
  checks: ReadinessChecks | null | undefined
  className?: string
}) {
  if (!checks) {
    return null
  }

  return (
    <ul className={cn('space-y-2', className)}>
      {READINESS_CHECK_ROWS.map((row) => {
        const passed = checks[row.key] ?? false
        return (
          <li
            key={row.key}
            className="flex items-start justify-between gap-3 rounded-xl bg-muted/20 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium">{row.label}</p>
              <p className="text-xs text-muted-foreground">{row.description}</p>
            </div>
            <span
              className={
                passed
                  ? 'text-xs font-semibold text-emerald-600 dark:text-emerald-400'
                  : 'text-xs font-semibold text-destructive'
              }
            >
              {passed ? 'Pass' : 'Fail'}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
