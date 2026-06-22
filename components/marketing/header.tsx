'use client'

import Link from 'next/link'
import { Show, UserButton } from '@clerk/nextjs'
import { useSyncExternalStore, useState } from 'react'

import { Logo } from '@/components/marketing/logo'
import { motion, useScroll, useSpring } from '@/components/motion/client-motion'
import { ThemeToggle } from '@/components/theme-toggle'
import { IconMenu2, IconX } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { signInPath, signUpPath } from '@/lib/auth/workspace-intent'
import { HEADER_SCROLL_SPRING } from '@/lib/motion/constants'
import { cn } from '@/lib/utils'

const menuItems = [
  { id: 'how-it-works', name: 'How it works', href: '#how-it-works' },
  { id: 'what-you-review', name: 'What you review', href: '#what-you-review' },
  { id: 'trust', name: 'Trust & control', href: '#trust' },
] as const

function subscribeToHash(onStoreChange: () => void) {
  window.addEventListener('hashchange', onStoreChange)
  return () => window.removeEventListener('hashchange', onStoreChange)
}

function getHashSnapshot() {
  return window.location.hash
}

function getServerHashSnapshot() {
  return ''
}

function subscribeToScroll(onStoreChange: () => void) {
  window.addEventListener('scroll', onStoreChange, { passive: true })
  return () => window.removeEventListener('scroll', onStoreChange)
}

function getScrollSnapshot() {
  return window.scrollY > 50
}

function getServerScrollSnapshot() {
  return false
}

export const MarketingHeader = ({
  clerkEnabled,
}: {
  clerkEnabled: boolean
}) => {
  const [menuState, setMenuState] = useState(false)
  const isScrolled = useSyncExternalStore(
    subscribeToScroll,
    getScrollSnapshot,
    getServerScrollSnapshot
  )
  const activeHash = useSyncExternalStore(
    subscribeToHash,
    getHashSnapshot,
    getServerHashSnapshot
  )
  const { scrollYProgress } = useScroll()
  const progressScaleX = useSpring(scrollYProgress, HEADER_SCROLL_SPRING)

  return (
    <header>
      <nav
        data-state={menuState && 'active'}
        className="fixed z-20 w-full px-2"
      >
        <div
          className={cn(
            'mx-auto mt-2 max-w-7xl px-6 transition-[background-color,border-color,backdrop-filter,max-width,padding] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] lg:px-12',
            isScrolled &&
              'max-w-5xl rounded-2xl border border-border/40 bg-background/50 shadow-lg backdrop-blur-xl lg:px-5'
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link
                href="/"
                aria-label="home"
                className="flex items-center space-x-2"
              >
                <Logo />
              </Link>

              <button
                type="button"
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <IconMenu2 className="m-auto size-6 duration-200 in-data-[state=active]:scale-0 in-data-[state=active]:rotate-180 in-data-[state=active]:opacity-0" />
                <IconX className="absolute inset-0 m-auto size-6 scale-0 -rotate-180 opacity-0 duration-200 in-data-[state=active]:scale-100 in-data-[state=active]:rotate-0 in-data-[state=active]:opacity-100" />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm font-medium">
                {menuItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group relative block text-muted-foreground duration-150 hover:text-foreground',
                        activeHash === item.href && 'text-foreground'
                      )}
                    >
                      <span>{item.name}</span>
                      <span
                        className={cn(
                          'absolute -bottom-1 left-0 h-0.5 w-full scale-x-0 bg-primary transition-transform duration-200',
                          activeHash === item.href && 'scale-x-100'
                        )}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border bg-background p-6 shadow-[var(--shadow-lg)] in-data-[state=active]:block md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-4 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none lg:in-data-[state=active]:flex dark:shadow-none dark:lg:bg-transparent">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base font-medium">
                  {menuItems.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="block text-muted-foreground duration-150 hover:text-foreground"
                      >
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col items-center space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <ThemeToggle />
                {clerkEnabled ? (
                  <>
                    <Show when="signed-out">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full px-4 text-sm transition-[transform,background-color] duration-150 ease-out active:scale-[0.96]"
                        render={<Link href={signInPath('recruiter')} />}
                        nativeButton={false}
                      >
                        <span>Sign in</span>
                      </Button>
                      <Button
                        size="sm"
                        variant={isScrolled ? 'default' : 'outline'}
                        className={cn(
                          'rounded-full px-5 text-sm font-medium transition-[transform,background-color] duration-150 ease-out active:scale-[0.96]',
                          !isScrolled &&
                            'ring-1 ring-border/40 hover:bg-muted/30'
                        )}
                        render={<Link href={signUpPath('recruiter')} />}
                        nativeButton={false}
                      >
                        <span>Start screening</span>
                      </Button>
                    </Show>
                    <Show when="signed-in">
                      <div className="rounded-full ring-1 ring-border/40">
                        <UserButton />
                      </div>
                    </Show>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant={isScrolled ? 'default' : 'outline'}
                    className={cn(
                      'rounded-full px-5 text-sm font-medium transition-transform',
                      !isScrolled && 'ring-1 ring-border/40 hover:bg-muted/30'
                    )}
                    render={<Link href="/sign-in" />}
                    nativeButton={false}
                  >
                    <span>Sign In</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        <motion.div
          aria-hidden
          className="mx-auto h-0.5 w-full max-w-7xl origin-left bg-primary/80"
          style={{ scaleX: progressScaleX }}
        />
      </nav>
    </header>
  )
}
