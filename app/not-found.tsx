import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/marketing/logo'
import { IconSearch } from '@tabler/icons-react'

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="flex h-20 items-center px-6 md:px-12">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo className="h-6 w-auto" />
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/40 shadow-sm ring-1 ring-border/50">
          <IconSearch className="h-8 w-8 text-muted-foreground" />
        </div>

        <h1 className="mt-8 font-serif text-5xl font-medium tracking-tight md:text-6xl lg:text-7xl">
          Page not found
        </h1>

        <p className="mt-6 max-w-md text-lg leading-relaxed text-pretty text-muted-foreground">
          The page you are looking for doesn't exist or has been moved. Check
          the URL or return home.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button
            size="lg"
            className="rounded-full px-8 text-base shadow-sm transition-transform active:scale-[0.96]"
            render={<Link href="/" />}
            nativeButton={false}
          >
            Return to homepage
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-8 text-base ring-1 ring-border/40 transition-transform hover:bg-muted/30 active:scale-[0.96]"
            render={<Link href="/admin" />}
            nativeButton={false}
          >
            Go to Dashboard
          </Button>
        </div>
      </main>
    </div>
  )
}
