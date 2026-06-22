export type PreferredWorkspace = 'candidate' | 'recruiter'

export type RecruiterCapability =
  | 'recruiter:access'
  | 'recruiter:candidates:read'
  | 'recruiter:candidates:write'
  | 'recruiter:screenings:write'
  | 'recruiter:templates:write'
  | 'recruiter:settings:write'
  | 'recruiter:billing:write'

export const RECRUITER_PERMISSION_MAP: Record<
  RecruiterCapability,
  `org:${string}`
> = {
  'recruiter:access': 'org:recruiter:access',
  'recruiter:candidates:read': 'org:recruiter:candidates:read',
  'recruiter:candidates:write': 'org:recruiter:candidates:write',
  'recruiter:screenings:write': 'org:recruiter:screenings:write',
  'recruiter:templates:write': 'org:recruiter:templates:write',
  'recruiter:settings:write': 'org:recruiter:settings:write',
  'recruiter:billing:write': 'org:recruiter:billing:write',
}

/** Admin-only capabilities (org:admin bypasses checks). */
export const ADMIN_CAPABILITIES = new Set<RecruiterCapability>([
  'recruiter:screenings:write',
  'recruiter:templates:write',
  'recruiter:settings:write',
  'recruiter:billing:write',
])

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
