'use client'

import { useEffect } from 'react'
import { IconRefresh } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { ErrorScreen } from '@/components/errors/error-screen'
import './globals.css'

/**
 * Last-resort boundary that catches errors thrown in the root layout itself.
 * Next replaces the entire document here, so this file must render its own
 * <html>/<body> and pull in global styles directly.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Fatal application error:', error)
  }, [error])

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ErrorScreen
          tone="alert"
          code="Error 500"
          title="Something broke"
          description="The application hit a fatal error and couldn't finish loading. Reloading usually clears it."
          actions={
            <Button
              size="lg"
              className="h-11 rounded-full px-7 text-base shadow-sm"
              onClick={reset}
            >
              <IconRefresh />
              Reload app
            </Button>
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
      </body>
    </html>
  )
}
