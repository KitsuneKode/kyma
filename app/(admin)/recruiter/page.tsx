import Link from 'next/link'
import { connection } from 'next/server'

import { api } from '@/convex/_generated/api'
import { RecruiterDashboard } from '@/components/recruiter/recruiter-dashboard'
import { RecruiterFirstRunChecklist } from '@/components/recruiter/recruiter-first-run-checklist'
import { WorkspaceEmptyState } from '@/components/workspace/empty-state'
import { Button } from '@/components/ui/button'
import {
  hasConvexDeployment,
  serverConvexQuery,
} from '@/lib/convex/server-query'
import { signInPath } from '@/lib/auth/workspace-intent'

export default async function AdminPage() {
  await connection()
  const nowMs = Date.now()

  const [candidatesResult, batchesResult, dashboardResult, onboardingResult] =
    hasConvexDeployment()
      ? await Promise.all([
          serverConvexQuery(api.recruiter.listReviewCandidates, {}),
          serverConvexQuery(api.admin.listScreeningBatches, {}),
          serverConvexQuery(api.admin.getDashboardSummary, { nowMs }),
          serverConvexQuery(api.onboarding.getRecruiterOnboardingStatus, {}),
        ])
      : [
          { ok: true as const, data: [] },
          { ok: true as const, data: [] },
          { ok: true as const, data: null },
          {
            ok: true as const,
            data: {
              isComplete: true,
              completedSteps: [],
              exampleReportSessionId: null,
              templateId: null,
              activeBatchId: null,
            },
          },
        ]

  const failedResult = [
    candidatesResult,
    batchesResult,
    dashboardResult,
    onboardingResult,
  ].find((result) => !result.ok)

  if (failedResult && !failedResult.ok) {
    return (
      <WorkspaceEmptyState
        eyebrow="Recruiter workspace"
        title={
          failedResult.kind === 'auth'
            ? 'Sign in required'
            : 'Unable to load dashboard'
        }
        description={
          failedResult.message ??
          'Your session may have expired or your organization access changed.'
        }
        action={
          failedResult.kind === 'auth' ? (
            <Button
              nativeButton={false}
              render={<Link href={signInPath('recruiter')} />}
            >
              Sign in again
            </Button>
          ) : (
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/recruiter" />}
            >
              Retry from recruiter home
            </Button>
          )
        }
      />
    )
  }

  const candidates = candidatesResult.ok ? candidatesResult.data : []
  const batches = batchesResult.ok ? batchesResult.data : []
  const dashboardSummary = dashboardResult.ok ? dashboardResult.data : null
  const onboarding = onboardingResult.ok ? onboardingResult.data : null

  const sessionsToday = dashboardSummary?.counts.sessionsToday ?? 0
  const reportsPending =
    dashboardSummary?.counts.pendingReviews ??
    candidates.filter((candidate) => candidate.reportStatus !== 'completed')
      .length
  const activeBatches = batches.filter(
    (batch) => batch.status === 'active'
  ).length
  const pendingReviews = candidates.filter(
    (c) =>
      c.reportStatus === 'manual_review' || c.latestDecision === 'manual_review'
  ).length

  return (
    <div className="flex w-full flex-col gap-8">
      {onboarding && !onboarding.isComplete ? (
        <RecruiterFirstRunChecklist
          completedSteps={onboarding.completedSteps}
          templateId={onboarding.templateId}
          activeBatchId={onboarding.activeBatchId}
          exampleReportSessionId={onboarding.exampleReportSessionId}
        />
      ) : null}
      <RecruiterDashboard
        sessionsToday={sessionsToday}
        reportsPending={reportsPending}
        activeBatches={activeBatches}
        pendingReviews={pendingReviews}
        dashboardSummary={dashboardSummary}
      />
    </div>
  )
}
