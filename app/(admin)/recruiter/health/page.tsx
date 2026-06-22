import { PageHeader } from '@/components/admin/page-header'
import { OperatorHealthPanel } from '@/components/admin/operator-health-panel'

export const metadata = {
  title: 'Platform health',
  description: 'Operator readiness checks for Kyma interview infrastructure.',
}

export default function RecruiterHealthPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Platform health"
        description="Verify LiveKit, Convex, Clerk, Inngest, and processing configuration before go-live."
      />
      <OperatorHealthPanel />
    </div>
  )
}
