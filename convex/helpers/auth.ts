import { ConvexError } from 'convex/values'

import type { MutationCtx, QueryCtx } from '../_generated/server'
import { convexEnv } from '../../lib/env/convex'
import { getOrgContextFromIdentity } from './orgContext'

const ORG_RECRUITER_ACCESS = 'org:recruiter:access'

function hasRecruiterAuthConfig() {
  return Boolean(
    convexEnv.CLERK_SECRET_KEY?.trim() &&
    convexEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
    (convexEnv.CLERK_FRONTEND_API_URL?.trim() ||
      convexEnv.CLERK_JWT_ISSUER_DOMAIN?.trim())
  )
}

function getOrgContext(
  identity: NonNullable<
    Awaited<ReturnType<QueryCtx['auth']['getUserIdentity']>>
  >
) {
  return getOrgContextFromIdentity(identity as Record<string, unknown>)
}

function hasOrgPermission(
  orgRole: string | null,
  orgPermissions: string[],
  permission: string
) {
  if (orgRole === 'org:admin') {
    return true
  }
  return orgPermissions.includes(permission)
}

async function requireOrgPermission(
  ctx: QueryCtx | MutationCtx,
  permission: string,
  deniedMessage = 'You are not authorized to access this resource.'
) {
  const identity = await requireIdentity(ctx)
  if (!identity) {
    throw new ConvexError(deniedMessage)
  }
  const { orgId, orgRole, orgPermissions } = getOrgContext(identity)
  if (!orgId) {
    throw new ConvexError('An active organization is required for this action.')
  }
  if (!hasOrgPermission(orgRole, orgPermissions, permission)) {
    throw new ConvexError(deniedMessage)
  }
  return { identity, orgId, orgRole, orgPermissions }
}

async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  if (!hasRecruiterAuthConfig()) {
    return null
  }
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new ConvexError('You must be signed in to access recruiter data.')
  }
  return identity
}

export async function requireRecruiterMember(ctx: QueryCtx | MutationCtx) {
  const { identity } = await requireOrgPermission(
    ctx,
    ORG_RECRUITER_ACCESS,
    'You are not authorized to access recruiter data.'
  )
  return identity
}

/** @deprecated Use requireRecruiterMember */
export const requireAdminIdentity = requireRecruiterMember

/** @deprecated Use requireRecruiterMember */
export const requireRecruiterIdentity = requireRecruiterMember

export async function getRecruiterActorId(ctx: QueryCtx | MutationCtx) {
  const identity = await requireRecruiterMember(ctx)
  return identity?.tokenIdentifier ?? identity?.subject ?? undefined
}

export async function requireOrgId(ctx: QueryCtx | MutationCtx) {
  const { orgId } = await requireOrgPermission(
    ctx,
    ORG_RECRUITER_ACCESS,
    'You must select an organization to access recruiter data.'
  )
  if (!orgId) {
    throw new ConvexError(
      'You must select an organization to access recruiter data.'
    )
  }
  return orgId
}

export async function getRole(ctx: QueryCtx | MutationCtx) {
  const identity = await requireIdentity(ctx)
  if (!identity) {
    return 'candidate' as const
  }
  const { orgId, orgRole, orgPermissions } = getOrgContext(identity)
  if (
    orgId &&
    hasOrgPermission(orgRole, orgPermissions, ORG_RECRUITER_ACCESS)
  ) {
    if (orgRole === 'org:admin') {
      return 'admin' as const
    }
    return 'recruiter' as const
  }
  return 'candidate' as const
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  role: 'admin' | 'recruiter' | 'candidate'
) {
  const identity = await requireIdentity(ctx)
  const resolvedRole = await getRole(ctx)
  if (resolvedRole !== role) {
    throw new ConvexError('You are not authorized to access this resource.')
  }
  return { identity, role: resolvedRole }
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const result = await requireOrgPermission(
    ctx,
    ORG_RECRUITER_ACCESS,
    'You are not authorized to access admin resources.'
  )
  if (result.orgRole !== 'org:admin') {
    throw new ConvexError('You are not authorized to access admin resources.')
  }
  return { identity: result.identity, role: 'admin' as const }
}

export async function isAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await requireIdentity(ctx)
  if (!identity) return false
  const { orgRole } = getOrgContext(identity)
  return orgRole === 'org:admin'
}
