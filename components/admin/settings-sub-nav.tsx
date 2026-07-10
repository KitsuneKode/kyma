'use client'

import { cn } from '@/lib/utils'

const SETTINGS_SECTIONS = [
  { id: 'billing', label: 'Billing' },
  { id: 'team', label: 'Team' },
  { id: 'models', label: 'Models' },
  { id: 'provider-keys', label: 'Provider keys' },
  { id: 'release-policy', label: 'Release policy' },
] as const

export function SettingsSubNav() {
  return (
    <nav
      aria-label="Settings sections"
      className="sticky top-4 z-10 -mx-1 flex flex-wrap gap-1 rounded-xl border border-border/50 bg-background/80 p-1 backdrop-blur-sm"
    >
      {SETTINGS_SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground'
          )}
        >
          {section.label}
        </a>
      ))}
    </nav>
  )
}
