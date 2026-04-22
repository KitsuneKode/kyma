import type { ReactNode } from 'react'

import { hasClerkServerCredentials } from '@/lib/clerk/config'
import { CandidateSidebar } from '@/components/candidate/app-sidebar'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export default function CandidateLayout({ children }: { children: ReactNode }) {
  const clerkEnabled = hasClerkServerCredentials()

  return (
    <SidebarProvider>
      <CandidateSidebar clerkEnabled={clerkEnabled} />
      <SidebarInset>
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b border-border/40 bg-background/80 px-4 backdrop-blur-xl transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-sm font-medium text-muted-foreground">
              My Interviews
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/10">
          <div className="mx-auto w-full max-w-5xl p-6 md:p-8 lg:p-12">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
