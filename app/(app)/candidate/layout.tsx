import type { ReactNode } from 'react'
import { connection } from 'next/server'

import { hasClerkServerCredentials } from '@/lib/clerk/config'
import { CandidateSidebar } from '@/components/candidate/app-sidebar'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { CandidateInviteLinkBanner } from '@/components/candidate/candidate-invite-link-banner'
import { CandidateInviteLinkError } from '@/components/candidate/candidate-invite-link-error'
import { WorkspacePromptBanner } from '@/components/auth/workspace-prompt-banner'
import { WorkspaceShell } from '@/components/workspace/workspace-shell'
import { requireCandidatePageAccess } from '@/lib/auth/access'
import { api } from '@/convex/_generated/api'
import {
  hasConvexDeployment,
  serverConvexMutation,
} from '@/lib/convex/server-query'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'

export default async function CandidateLayout({
  children,
}: {
  children: ReactNode
}) {
  await connection()
  const [access, token] = await Promise.all([
    requireCandidatePageAccess(),
    getServerConvexAuthToken(),
  ])
  const clerkEnabled = hasClerkServerCredentials()

  let linkError: string | null = null

  if (hasConvexDeployment() && token) {
    const linkResult = await serverConvexMutation(
      api.interviews.candidatePortal.linkCandidateInviteByEmail,
      {}
    )
    if (!linkResult.ok) {
      linkError =
        linkResult.message ??
        'Unable to link screening invites to your account.'
    }
  }

  return (
    <SidebarProvider>
      <CandidateSidebar clerkEnabled={clerkEnabled} />
      <SidebarInset>
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b border-border/40 bg-background/80 px-4 backdrop-blur-xl transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-sm font-medium text-muted-foreground">
              Candidate Portal
            </span>
          </div>
        </header>
        <WorkspaceShell>
          {access.preferredWorkspace === 'unassigned' ? (
            <WorkspacePromptBanner variant="candidate-default" />
          ) : null}
          {linkError ? <CandidateInviteLinkError message={linkError} /> : null}
          <CandidateInviteLinkBanner />
          {children}
        </WorkspaceShell>
      </SidebarInset>
    </SidebarProvider>
  )
}
