'use server'

import { auth } from '@clerk/nextjs/server'

import type { PreferredWorkspace } from '@/lib/auth/clerk-role'
import { resolveRecruiterAccess } from '@/lib/auth/clerk-role'
import {
  getPreferredWorkspaceFromClerk,
  getRedirectPathAfterWorkspaceChoice,
  setPreferredWorkspaceHint,
} from '@/lib/auth/workspace'

export type SetPreferredWorkspaceResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string }

export async function setPreferredWorkspace(
  workspace: PreferredWorkspace
): Promise<SetPreferredWorkspaceResult> {
  const { userId, orgId, has } = await auth()
  if (!userId) {
    return { ok: false, error: 'You must be signed in.' }
  }

  try {
    await setPreferredWorkspaceHint(userId, workspace)
    const confirmed = await getPreferredWorkspaceFromClerk(userId)
    if (confirmed !== workspace) {
      return {
        ok: false,
        error:
          'Workspace preference was not saved. Check Clerk API credentials.',
      }
    }

    const { canAccessRecruiter } = resolveRecruiterAccess({ orgId, has })

    return {
      ok: true,
      redirectTo: getRedirectPathAfterWorkspaceChoice({
        workspace,
        orgId: orgId ?? null,
        canAccessRecruiter,
      }),
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to save workspace preference.'
    return { ok: false, error: message }
  }
}
