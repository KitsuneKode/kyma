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

/**
 * Persona hint only. Never use this for recruiter authorization decisions.
 */
export function personaFromSessionClaims(
  sessionClaims: SessionClaims
): PersonaHint | null {
  const metadata = readMetadata(sessionClaims)
  const raw = metadata?.persona
  if (raw === 'candidate' || raw === 'recruiter' || raw === 'both') {
    return raw
  }
  return null
}
