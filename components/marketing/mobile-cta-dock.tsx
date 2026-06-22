'use client'

import Link from 'next/link'

import { signUpPath } from '@/lib/auth/workspace-intent'
import { Button } from '@/components/ui/button'

export function MobileCtaDock() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-4 md:hidden">
      <div className="pointer-events-auto rounded-2xl bg-card/95 p-2 shadow-[var(--shadow-lg)] ring-1 ring-border/60 backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="h-11 min-h-[44px] min-w-[44px] rounded-xl bg-primary text-primary-foreground transition-[transform,background-color] duration-150 ease-out active:scale-[0.96]"
            render={<Link href={signUpPath('recruiter')} />}
            nativeButton={false}
          >
            Start screening
          </Button>
          <Button
            variant="outline"
            className="h-11 min-h-[44px] min-w-[44px] rounded-xl transition-[transform,background-color] duration-150 ease-out active:scale-[0.96]"
            render={<Link href={signUpPath('candidate')} />}
            nativeButton={false}
          >
            Candidate flow
          </Button>
        </div>
      </div>
    </div>
  )
}
