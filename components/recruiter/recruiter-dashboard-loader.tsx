import { connection } from 'next/server'

import { api } from '@/convex/_generated/api'
import { RecruiterDashboard } from '@/components/recruiter/recruiter-dashboard'
import { RecruiterFirstRunChecklist } from '@/components/recruiter/recruiter-first-run-checklist'
import { RecruiterAccessState } from '@/components/recruiter/recruiter-access-state'
import {
  hasConvexDeployment,
  serverConvexQuery,
} from '@/lib/convex/server-query'

export async function RecruiterDashboardLoader() {
  await connection()
  const nowMs = Date.now()

  const [batchesResult, countsResult, onboardingResult] = hasConvexDeployment()
    ? await Promise.all([
        serverConvexQuery(api.recruiter.screenings.listScreeningBatches, {
          nowMs,
        }),
        serverConvexQuery(api.recruiter.dashboard.getDashboardCounts, {
          nowMs,
        }),
        serverConvexQuery(api.onboarding.getRecruiterOnboardingStatus, {}),
      ])
    : [
        { ok: true as const, data: [] },
        {
          ok: true as const,
          data: {
            pendingReviews: 0,
            manualReviews: 0,
            activeSessions: 0,
            expiringInvites: 0,
            sessionsToday: 0,
          },
        },
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

  const failedResult = [batchesResult, countsResult, onboardingResult].find(
    (result) => !result.ok
  )

  if (failedResult && !failedResult.ok) {
    return (
      <RecruiterAccessState
        kind={failedResult.kind}
        context="dashboard"
        message={failedResult.message}
      />
    )
  }

  const batches = batchesResult.ok ? batchesResult.data : []
  const counts = countsResult.ok ? countsResult.data : null
  const onboarding = onboardingResult.ok ? onboardingResult.data : null

  const sessionsToday = counts?.sessionsToday ?? 0
  const reportsPending = counts?.pendingReviews ?? 0
  const activeBatches = batches.filter(
    (batch) => batch.status === 'active'
  ).length
  const pendingReviews = counts?.manualReviews ?? 0

  return (
    <>
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
      />
    </>
  )
}
