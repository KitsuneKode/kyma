import Link from 'next/link'
import { Logo } from '@/components/marketing/logo'
import { CopyrightYear } from '@/components/marketing/copyright-year'
import { signInPath } from '@/lib/auth/workspace-intent'
import { personaPages, personaPath } from '@/lib/seo/personas'

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/20 bg-background pt-24 pb-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="inline-block transition-opacity hover:opacity-80"
            >
              <Logo className="h-8 w-auto" />
            </Link>
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-pretty text-muted-foreground">
              Live tutor screening and evidence-backed review for education
              teams. Hire on real teaching ability, not guesswork.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-wider text-foreground uppercase">
              Solutions
            </h3>
            <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/for"
                  className="transition-colors hover:text-foreground"
                >
                  All solutions
                </Link>
              </li>
              {personaPages.map((persona) => (
                <li key={persona.slug}>
                  <Link
                    href={personaPath(persona.slug)}
                    className="transition-colors hover:text-foreground"
                  >
                    {persona.eyebrow}
                  </Link>
                </li>
              ))}
            </ul>
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
                  How it works
                </Link>
              </li>
              <li>
                <Link
                  href="#what-you-review"
                  className="transition-colors hover:text-foreground"
                >
                  What you review
                </Link>
              </li>
              <li>
                <Link
                  href="#trust"
                  className="transition-colors hover:text-foreground"
                >
                  Trust &amp; control
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
          <p className="text-xs tracking-wide text-muted-foreground/70">
            Live tutor screening · evidence-backed review
          </p>
        </div>
      </div>
    </footer>
  )
}
