import {
  RECRUITER_PERMISSION_MAP,
  type RecruiterCapability,
} from './recruiter-capabilities'

export type PreferredWorkspace = 'candidate' | 'recruiter'

export {
  RECRUITER_PERMISSION_MAP,
  ADMIN_CAPABILITIES,
} from './recruiter-capabilities'
export type { RecruiterCapability } from './recruiter-capabilities'

type SessionClaims = Record<string, unknown> | null | undefined

type ClerkHasFn = (
  check:
    | { role: string; permission?: never }
    | { permission: string; role?: never }
) => boolean

function readMetadata(sessionClaims: SessionClaims) {
  const metadata = sessionClaims?.metadata
  if (!metadata || typeof metadata !== 'object') return null
  return metadata as Record<string, unknown>
}

function parsePreferredWorkspaceValue(
  value: unknown
): PreferredWorkspace | null {
  if (value === 'candidate' || value === 'recruiter') {
    return value
  }
  return null
}

/**
 * Workspace preference for post-login routing and nav only.
 * Never use this for recruiter authorization decisions.
 */
export function preferredWorkspaceFromSessionClaims(
  sessionClaims: SessionClaims
): PreferredWorkspace | null {
  const metadata = readMetadata(sessionClaims)
  if (!metadata) return null
  return parsePreferredWorkspaceValue(metadata.preferredWorkspace)
}

export function resolveRecruiterAccess(args: {
  orgId: string | null | undefined
  has?: ClerkHasFn
}): {
  canAccessRecruiter: boolean
  isOrgAdmin: boolean
} {
  if (!args.orgId || !args.has) {
    return { canAccessRecruiter: false, isOrgAdmin: false }
  }
  const isOrgAdmin = args.has({ role: 'org:admin' })
  const hasMemberAccess = args.has({
    permission: RECRUITER_PERMISSION_MAP['recruiter:access'],
  })
  return {
    canAccessRecruiter: isOrgAdmin || hasMemberAccess,
    isOrgAdmin,
  }
}

export function clerkHasCapability(
  has: ClerkHasFn | undefined,
  capability: RecruiterCapability
): boolean {
  if (!has) return false
  if (has({ role: 'org:admin' })) return true
  return has({ permission: RECRUITER_PERMISSION_MAP[capability] })
}
