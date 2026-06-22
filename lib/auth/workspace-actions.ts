'use server'

import { auth } from '@clerk/nextjs/server'

import type { PreferredWorkspace } from '@/lib/auth/clerk-role'
import { RECRUITER_PERMISSION_MAP } from '@/lib/auth/clerk-role'
import {
  getPreferredWorkspaceFromClerk,
  getRedirectPathAfterWorkspaceChoice,
  setPreferredWorkspaceHint,
  setWorkspaceRoutingCookie,
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
    await setWorkspaceRoutingCookie(workspace)
    const confirmed = await getPreferredWorkspaceFromClerk(userId)
    if (confirmed !== workspace) {
      return {
        ok: false,
        error:
          'Workspace preference was not saved. Check Clerk API credentials.',
      }
    }

    const canAccessRecruiter = Boolean(
      orgId &&
      (has?.({ role: 'org:admin' }) ||
        has?.({
          permission: RECRUITER_PERMISSION_MAP['recruiter:access'],
        }))
    )

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
