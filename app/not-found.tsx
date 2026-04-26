import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/marketing/logo'
import { IconSearch } from '@tabler/icons-react'

export default function NotFound() {
  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#0a0a0a]">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
      <header className="flex h-20 items-center px-6 md:px-12">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo className="h-6 w-auto" />
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="flex h-20 w-20 animate-in items-center justify-center rounded-3xl bg-muted/30 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.35)] duration-300 fade-in-0 zoom-in-95">
          <IconSearch className="h-8 w-8 text-muted-foreground" />
        </div>

        <h1 className="mt-8 animate-in text-5xl font-semibold tracking-tight text-balance duration-300 fade-in-0 slide-in-from-bottom-2 md:text-6xl lg:text-7xl">
          Page not found
        </h1>

        <p className="mt-6 max-w-md animate-in text-lg leading-relaxed text-pretty text-muted-foreground duration-300 fade-in-0 slide-in-from-bottom-2">
          The page you are looking for doesn't exist or has been moved. Check
          the URL or return home.
        </p>

        <div className="mt-10 flex animate-in flex-wrap items-center justify-center gap-4 duration-300 fade-in-0 slide-in-from-bottom-2">
          <Button
            size="lg"
            className="rounded-full px-8 text-base shadow-sm transition-transform"
            render={<Link href="/" />}
            nativeButton={false}
          >
            Return to homepage
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-8 text-base ring-1 ring-border/40 transition-transform hover:bg-muted/30"
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
