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
import { WorkspacePromptBanner } from '@/components/auth/workspace-prompt-banner'
import { WorkspaceShell } from '@/components/workspace/workspace-shell'
import { requireCandidatePageAccess } from '@/lib/auth/access'
import { fetchMutation } from 'convex/nextjs'
import { api } from '@/convex/_generated/api'
import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'

export default async function CandidateLayout({
  children,
}: {
  children: ReactNode
}) {
  await connection()
  const access = await requireCandidatePageAccess()
  const clerkEnabled = hasClerkServerCredentials()
  const token = await getServerConvexAuthToken()

  if (clientEnv.NEXT_PUBLIC_CONVEX_URL && token) {
    await fetchMutation(
      api.interviews.linkCandidateInviteByEmail,
      {},
      { token: token ?? undefined }
    ).catch(() => null)
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
          {children}
        </WorkspaceShell>
      </SidebarInset>
    </SidebarProvider>
  )
}
