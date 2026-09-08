import 'server-only'

import { AuthSetupRequired } from '@/components/auth/auth-setup-required'
import { resolveAuthSetupSurfaceFromEnv } from '@/lib/env/node-env'
import type { ClerkSetupStatus } from '@/lib/clerk/setup-status'

export function UnconfiguredAuth({
  missing,
  derivedIssuerDomain,
}: Pick<ClerkSetupStatus, 'missing' | 'derivedIssuerDomain'>) {
  return (
    <AuthSetupRequired
      missing={missing}
      derivedIssuerDomain={derivedIssuerDomain}
      variant={resolveAuthSetupSurfaceFromEnv()}
    />
  )
}
