/**
 * Single read path for app role from Clerk session claims.
 *
 * Configure the Clerk **JWT template** (for Convex) so `publicMetadata.role` is included
 * in the token — for Next.js `auth()` the same custom claim is typically exposed as
 * `sessionClaims.metadata.role` when the template names the claim `metadata` (see Clerk
 * dashboard: JWT template → short-lived token claims).
 *
 * Source of truth: `user.publicMetadata.role` in Clerk; do not set production roles
 * from the client. Promotions use Clerk Dashboard, Backend API, or webhooks.
 */
export type AppRole = 'admin' | 'recruiter' | 'candidate'

export function roleFromSessionClaims(
  sessionClaims: Record<string, unknown> | null | undefined
): AppRole | null {
  const raw = (sessionClaims?.metadata as { role?: string } | undefined)?.role
  if (raw === 'admin' || raw === 'recruiter' || raw === 'candidate') {
    return raw
  }
  return null
}
