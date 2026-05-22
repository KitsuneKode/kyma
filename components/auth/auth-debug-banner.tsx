import { auth } from '@clerk/nextjs/server'

import {
  hasLegacyBothPersona,
  personaFromSessionClaims,
  preferredWorkspaceFromSessionClaims,
} from '@/lib/auth/clerk-role'
import { getPreferredWorkspaceFromClerk } from '@/lib/auth/workspace'
import { serverEnv } from '@/lib/env/server'

export async function AuthDebugBanner() {
  if (serverEnv.KYMA_AUTH_DEBUG !== '1') {
    return null
  }

  const { userId, sessionClaims } = await auth()
  if (!userId) {
    return null
  }

  const clerkWorkspace = await getPreferredWorkspaceFromClerk(userId).catch(
    () => null
  )
  const claimWorkspace = preferredWorkspaceFromSessionClaims(
    sessionClaims as Record<string, unknown> | null | undefined
  )
  const legacyPersona = personaFromSessionClaims(
    sessionClaims as Record<string, unknown> | null | undefined
  )
  const legacyBoth = hasLegacyBothPersona(
    sessionClaims as Record<string, unknown> | null | undefined
  )

  const mismatch =
    clerkWorkspace != null &&
    claimWorkspace != null &&
    clerkWorkspace !== claimWorkspace

  return (
    <aside className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
      <p className="font-medium">Auth debug (KYMA_AUTH_DEBUG=1)</p>
      <ul className="mt-2 space-y-1 font-mono">
        <li>clerk.publicMetadata.workspace: {clerkWorkspace ?? 'null'}</li>
        <li>
          sessionClaims.metadata.preferredWorkspace: {claimWorkspace ?? 'null'}
        </li>
        <li>
          sessionClaims.metadata.persona (legacy): {legacyPersona ?? 'null'}
        </li>
        <li>legacy both: {legacyBoth ? 'yes' : 'no'}</li>
      </ul>
      {claimWorkspace == null && clerkWorkspace != null ? (
        <p className="mt-2">
          JWT template likely missing <code>metadata.preferredWorkspace</code>{' '}
          or <code>metadata.persona</code>. See{' '}
          <code>.docs/auth-org-rbac-cutover-checklist.md</code>.
        </p>
      ) : null}
      {mismatch ? (
        <p className="mt-2">
          Clerk metadata and session claims disagree — sign out/in or refresh
          token.
        </p>
      ) : null}
    </aside>
  )
}
