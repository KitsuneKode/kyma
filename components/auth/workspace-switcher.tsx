'use client'

import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { usePathname, useRouter } from 'next/navigation'
import { useTransition } from 'react'

import type { PreferredWorkspace } from '@/lib/auth/clerk-role'
import { setPreferredWorkspace } from '@/lib/auth/workspace-actions'
import { cn } from '@/lib/utils'

type WorkspaceSwitcherProps = {
  preferredWorkspace: PreferredWorkspace | null
  canAccessRecruiter: boolean
}

export function WorkspaceSwitcher({
  preferredWorkspace,
  canAccessRecruiter,
}: WorkspaceSwitcherProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { getToken } = useAuth()
  const [isPending, startTransition] = useTransition()

  const onRecruiterSurface =
    pathname.startsWith('/recruiter') || pathname.startsWith('/admin')
  const onCandidateSurface = pathname.startsWith('/candidate')

  function switchWorkspace(workspace: PreferredWorkspace) {
    startTransition(async () => {
      const result = await setPreferredWorkspace(workspace)
      if (!result.ok) {
        return
      }
      await getToken({ skipCache: true }).catch(() => null)
      router.push(result.redirectTo)
      router.refresh()
    })
  }

  if (!canAccessRecruiter) {
    return (
      <nav className="flex items-center gap-3 text-sm" aria-label="Workspace">
        <WorkspaceTab
          label="Candidate"
          active={onCandidateSurface || !onRecruiterSurface}
          disabled={isPending}
          onClick={() => switchWorkspace('candidate')}
        />
        <Link
          href="/onboarding/recruiter"
          className={cn(
            'rounded-md px-3 py-1.5 transition-colors',
            onRecruiterSurface
              ? 'bg-muted font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Recruiter setup
        </Link>
      </nav>
    )
  }

  return (
    <nav
      className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-0.5 text-sm"
      aria-label="Workspace"
    >
      <WorkspaceTab
        label="Candidate"
        active={
          onCandidateSurface ||
          (!onRecruiterSurface &&
            (preferredWorkspace === 'candidate' || preferredWorkspace == null))
        }
        disabled={isPending}
        onClick={() => switchWorkspace('candidate')}
      />
      <WorkspaceTab
        label="Recruiter"
        active={
          onRecruiterSurface ||
          (!onCandidateSurface && preferredWorkspace === 'recruiter')
        }
        disabled={isPending}
        onClick={() => switchWorkspace('recruiter')}
      />
    </nav>
  )
}

function WorkspaceTab({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-md px-3 py-1.5 transition-colors disabled:opacity-60',
        active
          ? 'bg-background font-medium text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {label}
    </button>
  )
}
