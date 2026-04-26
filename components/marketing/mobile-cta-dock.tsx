'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'

export function MobileCtaDock() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-4 md:hidden">
      <div className="pointer-events-auto rounded-2xl bg-card/95 p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="h-11 rounded-xl bg-primary text-primary-foreground"
            render={<Link href="#demo" />}
            nativeButton={false}
          >
            Book demo
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            render={<Link href="/interviews/demo-invite" />}
            nativeButton={false}
          >
            Try flow
          </Button>
        </div>
      </div>
    </div>
  )
}
