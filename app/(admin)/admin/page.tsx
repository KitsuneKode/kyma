import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'
import { PremiumRecruiterDashboard } from '@/components/recruiter/premium-dashboard'
import { api } from '@/convex/_generated/api'
import { fetchQuery } from 'convex/nextjs'

export default async function AdminPage() {
  const token = await getServerConvexAuthToken()
  const [candidates, batches, dashboardSummary] =
    clientEnv.NEXT_PUBLIC_CONVEX_URL
      ? await Promise.all([
          fetchQuery(
            api.recruiter.listReviewCandidates,
            {},
            { token: token ?? undefined }
          ).catch(() => []),
          fetchQuery(
            api.admin.listScreeningBatches,
            {},
            { token: token ?? undefined }
          ).catch(() => []),
          fetchQuery(
            api.admin.getDashboardSummary,
            {},
            { token: token ?? undefined }
          ).catch(() => null),
        ])
      : [[], [], null]

  const sessionsToday = candidates.filter((candidate) => {
    if (!candidate.startedAt) return false
    const started = new Date(candidate.startedAt)
    const now = new Date()
    return started.toDateString() === now.toDateString()
  }).length
  const reportsPending =
    dashboardSummary?.counts.pendingReviews ??
    candidates.filter((candidate) => candidate.reportStatus !== 'completed')
      .length
  const activeBatches =
    dashboardSummary?.counts.activeSessions ??
    batches.filter((batch) => batch.status === 'active').length
  const pendingReviews = candidates.filter(
    (c) =>
      c.reportStatus === 'manual_review' || c.latestDecision === 'manual_review'
  ).length

  return (
    <PremiumRecruiterDashboard
      sessionsToday={sessionsToday}
      reportsPending={reportsPending}
      activeBatches={activeBatches}
      pendingReviews={pendingReviews}
      dashboardSummary={dashboardSummary}
    />
  )
}
