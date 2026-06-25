import { api } from '@/convex/_generated/api'
import { CandidateReadinessPanel } from '@/components/candidate/readiness-panel'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { serverConvexPortalQuery } from '@/lib/convex/server-query'

export default async function CandidateReadinessPage() {
  const runsResult = await serverConvexPortalQuery(
    api.readiness.getCandidateReadinessRuns,
    {},
    []
  )

  if (runsResult.status === 'error') {
    return (
      <section className="space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Readiness history unavailable</AlertTitle>
          <AlertDescription>{runsResult.message}</AlertDescription>
        </Alert>
      </section>
    )
  }

  return <CandidateReadinessPanel initialRuns={runsResult.data} />
}
