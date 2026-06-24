import { api } from '@/convex/_generated/api'
import { CandidateReadinessPanel } from '@/components/candidate/readiness-panel'
import { serverConvexQueryWithFallback } from '@/lib/convex/server-query'

export default async function CandidateReadinessPage() {
  const runsResult = await serverConvexQueryWithFallback(
    api.readiness.getCandidateReadinessRuns,
    {},
    []
  )

  return (
    <CandidateReadinessPanel
      initialRuns={runsResult.ok ? runsResult.data : []}
    />
  )
}
