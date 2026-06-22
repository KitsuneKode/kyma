'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { IconRefresh, IconHome } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { ErrorScreen } from '@/components/errors/error-screen'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled route error:', error)
  }, [error])

  return (
    <ErrorScreen
      tone="alert"
      code="Error 500"
      title="Something broke"
      description="An unexpected error interrupted this page. You can retry, or head back home while we recover the signal."
      actions={
        <>
          <Button
            size="lg"
            className="h-11 rounded-full px-7 text-base shadow-sm"
            onClick={reset}
          >
            <IconRefresh />
            Try again
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-11 rounded-full px-7 text-base ring-1 ring-border/40"
            render={<Link href="/" />}
            nativeButton={false}
          >
            <IconHome />
            Return home
          </Button>
        </>
      }
      footnote={
        error.digest ? (
          <span className="font-mono text-xs">
            Reference:{' '}
            <span className="text-foreground/70">{error.digest}</span>
          </span>
        ) : null
      }
    />
  )
}
