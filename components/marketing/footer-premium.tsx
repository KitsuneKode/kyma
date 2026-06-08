import Link from 'next/link'
import { Logo } from '@/components/marketing/logo'
import { CopyrightYear } from '@/components/marketing/copyright-year'
import { signInPath } from '@/lib/auth/workspace-intent'

export function PremiumFooter() {
  return (
    <footer className="border-t border-border/20 bg-background pt-24 pb-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="inline-block transition-opacity hover:opacity-80"
            >
              <Logo className="h-8 w-auto" />
            </Link>
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-pretty text-muted-foreground">
              Structured live interviews and evidence-backed review for
              recruitment teams. Hire with confidence, not guesswork.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-wider text-foreground uppercase">
              Platform
            </h3>
            <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
              <li>
                <Link
                  href="#how-it-works"
                  className="transition-colors hover:text-foreground"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#how-it-works"
                  className="transition-colors hover:text-foreground"
                >
                  How it Works
                </Link>
              </li>
              <li>
                <Link
                  href={signInPath('recruiter')}
                  className="transition-colors hover:text-foreground"
                >
                  Recruiter sign in
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-wider text-foreground uppercase">
              Legal
            </h3>
            <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
              <li>
                <Link
                  href="#"
                  className="transition-colors hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="transition-colors hover:text-foreground"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="transition-colors hover:text-foreground"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-wider text-foreground uppercase">
              Company
            </h3>
            <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
              <li>
                <Link
                  href="#"
                  className="transition-colors hover:text-foreground"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="transition-colors hover:text-foreground"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-24 flex flex-col items-center justify-between gap-4 border-t border-border/20 pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © <CopyrightYear /> Kyma. All rights reserved.
          </p>
          <div className="flex gap-4">
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground opacity-50" />
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground opacity-50" />
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground opacity-50" />
          </div>
        </div>
      </div>
    </footer>
  )
}
