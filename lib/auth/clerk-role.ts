export type PreferredWorkspace = 'candidate' | 'recruiter'

/** @deprecated Legacy routing hint; do not write `both` for new users. */
export type PersonaHint = 'candidate' | 'recruiter' | 'both'

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

type SessionClaims = Record<string, unknown> | null | undefined

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

  const preferred = parsePreferredWorkspaceValue(metadata.preferredWorkspace)
  if (preferred) return preferred

  const legacyPersona = metadata.persona
  if (legacyPersona === 'both') {
    return null
  }
  return parsePreferredWorkspaceValue(legacyPersona)
}

/**
 * Legacy persona hint parser. Prefer `preferredWorkspaceFromSessionClaims`.
 */
export function personaFromSessionClaims(
  sessionClaims: SessionClaims
): PersonaHint | null {
  const metadata = readMetadata(sessionClaims)
  const raw = metadata?.persona
  if (raw === 'candidate' || raw === 'recruiter' || raw === 'both') {
    return raw
  }

  const preferred = parsePreferredWorkspaceValue(metadata?.preferredWorkspace)
  if (preferred) {
    return preferred
  }

  return null
}

export function hasLegacyBothPersona(sessionClaims: SessionClaims): boolean {
  const metadata = readMetadata(sessionClaims)
  return metadata?.persona === 'both'
}
