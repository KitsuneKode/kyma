/**
 * Canonical recruiter capability vocabulary and the Clerk org-permission strings
 * they map to. This is the single source of truth shared by the Next.js auth
 * helpers (`lib/auth/*`) and the Convex auth guard (`convex/helpers/auth.ts`) so
 * the capability set and permission slugs can never drift between the frontend
 * and backend. Keep this module dependency-free so it is safe to import from the
 * Convex runtime.
 */

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
