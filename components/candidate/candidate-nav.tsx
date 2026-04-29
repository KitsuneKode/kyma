'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/candidate', label: 'Overview', exact: true },
  { href: '/candidate/interviews', label: 'Interviews', exact: false },
  { href: '/candidate/readiness', label: 'Readiness', exact: false },
  { href: '/candidate/profile', label: 'Profile', exact: false },
]

export function CandidateNav() {
  const pathname = usePathname()

  return (
    <nav className="mb-6 flex flex-wrap gap-4 text-sm">
      {NAV_LINKS.map(({ href, label, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'transition-colors',
              isActive
                ? 'font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
