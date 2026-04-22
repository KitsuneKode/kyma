'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Show, SignInButton, UserButton } from '@clerk/nextjs'
import {
  IconLayoutDashboard,
  IconVideo,
  IconHistory,
  IconSettings,
} from '@tabler/icons-react'

import { Logo } from '@/components/marketing/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const NAV_ITEMS = [
  {
    title: 'Dashboard',
    url: '/interviews',
    icon: IconLayoutDashboard,
    exact: true,
  },
  {
    title: 'Upcoming',
    url: '#upcoming',
    icon: IconVideo,
    exact: false,
  },
  {
    title: 'History',
    url: '#history',
    icon: IconHistory,
    exact: false,
  },
  {
    title: 'Preferences',
    url: '#preferences',
    icon: IconSettings,
    exact: false,
  },
]

export function CandidateSidebar({
  clerkEnabled,
  ...props
}: React.ComponentProps<typeof Sidebar> & { clerkEnabled: boolean }) {
  const pathname = usePathname()

  return (
    <Sidebar {...props}>
      <SidebarHeader className="h-16 justify-center px-6">
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <Logo className="h-6 w-auto" />
          <span className="sr-only">Kyma</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Candidate Portal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = item.exact
                  ? pathname === item.url
                  : pathname?.startsWith(item.url) && item.url !== '#'

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-card p-2 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] ring-1 ring-border/50">
          {clerkEnabled ? (
            <>
              <Show when="signed-out">
                <div className="flex flex-col gap-2">
                  <SignInButton />
                </div>
              </Show>
              <Show when="signed-in">
                <div className="flex items-center">
                  <UserButton
                    showName
                    appearance={{
                      elements: {
                        userButtonBox: 'flex-row-reverse',
                        userButtonOuterIdentifier: 'text-sm font-medium pr-2',
                      },
                    }}
                  />
                </div>
              </Show>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                AM
              </div>
              <span className="text-sm font-medium text-foreground">
                Aarav M.
              </span>
            </div>
          )}
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
