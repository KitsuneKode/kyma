import Link from 'next/link'

import { WorkspacePageHeader } from '@/components/workspace/page-header'
import { OperatorHealthPanel } from '@/components/admin/operator-health-panel'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Platform health',
  description: 'Operator readiness checks for Kyma interview infrastructure.',
}

export default function RecruiterHealthPage() {
  return (
    <div className="space-y-8">
      <WorkspacePageHeader
        eyebrow="Operations"
        title="Platform health"
        description="Verify LiveKit, Convex, Clerk, Inngest, and processing configuration before go-live."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/recruiter" />}
          >
            Back to recruiter
          </Button>
        }
      />
      <OperatorHealthPanel />
    </div>
  )
}
