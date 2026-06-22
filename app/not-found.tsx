import Link from 'next/link'
import { cacheLife } from 'next/cache'
import { IconArrowLeft, IconLayoutDashboard } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { ErrorScreen } from '@/components/errors/error-screen'

export default async function NotFound() {
  'use cache'
  cacheLife('hours')

  return (
    <ErrorScreen
      code="Error 404"
      title="Page not found"
      description="The page you are looking for doesn't exist or has been moved. Check the URL, or head back to a place you know."
      actions={
        <>
          <Button
            size="lg"
            className="h-11 rounded-full px-7 text-base shadow-sm"
            render={<Link href="/" />}
            nativeButton={false}
          >
            <IconArrowLeft />
            Return home
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-11 rounded-full px-7 text-base ring-1 ring-border/40"
            render={<Link href="/recruiter" />}
            nativeButton={false}
          >
            <IconLayoutDashboard />
            Recruiter hub
          </Button>
        </>
      }
    />
  )
}
