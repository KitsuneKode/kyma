import 'server-only'

import { clerkClient } from '@clerk/nextjs/server'

import type { PreferredWorkspace } from '@/lib/auth/clerk-role'

function parseWorkspaceFromPublicMetadata(
  metadata: Record<string, unknown> | null | undefined
): PreferredWorkspace | null {
  if (!metadata) return null

  const preferred = metadata.preferredWorkspace
  if (preferred === 'candidate' || preferred === 'recruiter') {
    return preferred
  }

  const legacyPersona = metadata.persona
  if (legacyPersona === 'both') {
    return null
  }
  if (legacyPersona === 'candidate' || legacyPersona === 'recruiter') {
    return legacyPersona
  }

  return null
}

export async function setPreferredWorkspaceHint(
  userId: string,
  workspace: PreferredWorkspace
) {
  const client = await clerkClient()
  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      preferredWorkspace: workspace,
    },
  })
}

export async function getPreferredWorkspaceFromClerk(
  userId: string
): Promise<PreferredWorkspace | null> {
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  return parseWorkspaceFromPublicMetadata(
    user.publicMetadata as Record<string, unknown>
  )
}

export function getRedirectPathAfterWorkspaceChoice(args: {
  workspace: PreferredWorkspace
  orgId: string | null
  canAccessRecruiter: boolean
}): string {
  if (args.workspace === 'recruiter') {
    if (args.orgId && args.canAccessRecruiter) {
      return '/recruiter'
    }
    return '/onboarding/recruiter'
  }
  return '/candidate'
}
