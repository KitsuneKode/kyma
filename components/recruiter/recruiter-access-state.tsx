'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { WorkspaceEmptyState } from '@/components/workspace/empty-state'
import { signInPath } from '@/lib/auth/workspace-intent'
import type { FetchResult } from '@/lib/convex/server-fetch'

export type RecruiterAccessFailureKind = Extract<
  FetchResult<unknown>,
  { ok: false }
>['kind']

type RecruiterAccessContext =
  | 'dashboard'
  | 'candidates'
  | 'review'
  | 'templates'
  | 'generic'

const CONTEXT_COPY: Record<
  RecruiterAccessContext,
  { title: string; description: string }
> = {
  dashboard: {
    title: 'Unable to load dashboard',
    description:
      'Your session may have expired or your organization access changed.',
  },
  candidates: {
    title: 'Unable to load candidates',
    description:
      'Your session may have expired or your organization access changed.',
  },
  review: {
    title: 'Unable to load review',
    description:
      'Your session may have expired or you may not have access to this organization.',
  },
  templates: {
    title: 'Templates unavailable',
    description:
      'Your session may have expired or your organization access changed.',
  },
  generic: {
    title: 'Unable to load recruiter workspace',
    description:
      'Your session may have expired or your organization access changed.',
  },
}

function resolveTitle(
  kind: RecruiterAccessFailureKind,
  context: RecruiterAccessContext
) {
  if (kind === 'auth') return 'Sign in required'
  if (kind === 'not_found' && context === 'review') {
    return 'Candidate session not found'
  }
  if (kind === 'forbidden') return 'Access denied'
  return CONTEXT_COPY[context].title
}

function resolveDescription(
  kind: RecruiterAccessFailureKind,
  context: RecruiterAccessContext,
  message?: string
) {
  if (message) return message
  if (kind === 'not_found' && context === 'review') {
    return 'The session id may be invalid, or Convex is not configured in this environment.'
  }
  if (kind === 'forbidden') {
    return 'You do not have permission to view this recruiter workspace.'
  }
  return CONTEXT_COPY[context].description
}

type RecruiterAccessStateProps = {
  kind: RecruiterAccessFailureKind
  context?: RecruiterAccessContext
  message?: string
  eyebrow?: string
  retryHref?: string
  backHref?: string
  backLabel?: string
  action?: ReactNode
}

export function RecruiterAccessState({
  kind,
  context = 'generic',
  message,
  eyebrow = 'Recruiter workspace',
  retryHref,
  backHref = '/recruiter',
  backLabel = 'Back to recruiter',
  action,
}: RecruiterAccessStateProps) {
  const router = useRouter()

  const defaultAction =
    kind === 'auth' ? (
      <Button
        nativeButton={false}
        render={<Link href={signInPath('recruiter')} />}
      >
        Sign in again
      </Button>
    ) : context === 'review' ? (
      <Button
        nativeButton={false}
        variant="outline"
        render={<Link href="/recruiter/candidates" />}
      >
        Back to candidates
      </Button>
    ) : (
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.refresh()}
        >
          Retry
        </Button>
        <Button
          nativeButton={false}
          variant="ghost"
          render={<Link href={retryHref ?? backHref} />}
        >
          {backLabel}
        </Button>
      </div>
    )

  return (
    <WorkspaceEmptyState
      eyebrow={eyebrow}
      title={resolveTitle(kind, context)}
      description={resolveDescription(kind, context, message)}
      action={action ?? defaultAction}
    />
  )
}
