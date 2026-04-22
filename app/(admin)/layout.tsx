import type { ReactNode } from 'react'

import { hasClerkServerCredentials } from '@/lib/clerk/config'
import { AppSidebar } from '@/components/admin/app-sidebar'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const clerkEnabled = hasClerkServerCredentials()

  return (
    <SidebarProvider>
      <AppSidebar clerkEnabled={clerkEnabled} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-background/50">
          <div className="mx-auto w-full max-w-7xl p-8">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
