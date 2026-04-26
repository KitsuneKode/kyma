import { ConvexError } from 'convex/values'

import type { MutationCtx, QueryCtx } from '../_generated/server'
import { runtimeEnv } from '../../lib/env/runtime'

function hasRecruiterAuthConfig() {
  return Boolean(
    runtimeEnv.CLERK_SECRET_KEY?.trim() &&
    runtimeEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
    (runtimeEnv.CLERK_FRONTEND_API_URL?.trim() ||
      runtimeEnv.CLERK_JWT_ISSUER_DOMAIN?.trim())
  )
}

export async function requireRecruiterIdentity(ctx: QueryCtx | MutationCtx) {
  return await requireAdminIdentity(ctx)
}

export async function getRecruiterActorId(ctx: QueryCtx | MutationCtx) {
  const identity = await requireRecruiterIdentity(ctx)

  return identity?.tokenIdentifier ?? identity?.subject ?? undefined
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

function getRoleFromClaims(
  identity: NonNullable<
    Awaited<ReturnType<QueryCtx['auth']['getUserIdentity']>>
  >
) {
  const roleCandidate = (identity as Record<string, unknown>)['metadata']
  const metadataRole =
    roleCandidate && typeof roleCandidate === 'object'
      ? (roleCandidate as Record<string, unknown>)['role']
      : undefined
  if (
    metadataRole === 'admin' ||
    metadataRole === 'recruiter' ||
    metadataRole === 'candidate'
  ) {
    return metadataRole
  }
  return undefined
}

export async function getRole(ctx: QueryCtx | MutationCtx) {
  const identity = await requireIdentity(ctx)
  if (!identity) {
    return 'candidate' as const
  }
  const claimRole = getRoleFromClaims(identity)
  if (claimRole) {
    return claimRole
  }
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique()
  if (user?.role) {
    return user.role
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
  return await requireRole(ctx, 'admin')
}

export async function isAdmin(ctx: QueryCtx | MutationCtx) {
  const role = await getRole(ctx)
  return role === 'admin' || role === 'recruiter'
}

export async function requireAdminIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await requireIdentity(ctx)
  if (!identity) {
    return null
  }
  const role = await getRole(ctx)
  if (role !== 'admin' && role !== 'recruiter') {
    throw new ConvexError('You are not authorized to access this resource.')
  }
  return identity
}
