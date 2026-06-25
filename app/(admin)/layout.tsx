import type { ReactNode } from 'react'
import { connection } from 'next/server'
import { OrganizationSwitcher } from '@clerk/nextjs'

import { hasClerkServerCredentials } from '@/lib/clerk/config'
import { AppSidebar } from '@/components/admin/app-sidebar'
import { CommandPalette } from '@/components/admin/command-palette'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { AppAuthGate } from '@/components/auth/app-auth-gate'
import { WorkspaceShell } from '@/components/workspace/workspace-shell'
import { requireRecruiterPageAccess } from '@/lib/auth/access'
import { getClerkSetupStatus } from '@/lib/clerk/setup-status'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  await connection()
  await requireRecruiterPageAccess()
  const clerkEnabled = hasClerkServerCredentials()
  const setupStatus = getClerkSetupStatus()

  return (
    <SidebarProvider>
      <AppSidebar clerkEnabled={clerkEnabled} />
      <SidebarInset>
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b border-border/40 bg-background/80 px-4 backdrop-blur-xl transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-sm font-medium text-muted-foreground">
              Recruiter Workspace
            </span>
          </div>
          <div className="ml-auto">
            <OrganizationSwitcher
              hidePersonal
              afterSelectOrganizationUrl="/recruiter"
            />
          </div>
        </header>
        <WorkspaceShell>
          <AppAuthGate
            clerkEnabled={clerkEnabled}
            setupStatus={setupStatus}
            signInHref="/sign-in/recruiter"
          >
            {children}
          </AppAuthGate>
        </WorkspaceShell>
        <CommandPalette />
      </SidebarInset>
    </SidebarProvider>
  )
}
