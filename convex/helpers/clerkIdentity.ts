import { ConvexError } from 'convex/values'

import type { Doc } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { runtimeEnv } from '../../lib/env/runtime'

type AuthIdentity = NonNullable<
  Awaited<ReturnType<QueryCtx['auth']['getUserIdentity']>>
>

function isBootstrapAdminEmail(email?: string | null) {
  if (!email) return false
  const allowlist =
    runtimeEnv.KYMA_ADMIN_EMAILS?.split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean) ?? []
  return allowlist.includes(email.toLowerCase())
}

/**
 * Stable Clerk user id for Convex `users.clerkId` lookups.
 * Prefer `subject` when it is a Clerk user id; otherwise parse `tokenIdentifier`.
 */
export function clerkIdFromIdentity(identity: AuthIdentity): string {
  const subject = identity.subject?.trim()
  if (subject?.startsWith('user_')) {
    return subject
  }

  const tokenIdentifier = identity.tokenIdentifier?.trim()
  if (tokenIdentifier) {
    const segment = tokenIdentifier.includes('|')
      ? tokenIdentifier.split('|').pop()?.trim()
      : tokenIdentifier
    if (segment?.startsWith('user_')) {
      return segment
    }
  }

  if (subject) {
    return subject
  }

  throw new ConvexError(
    'Unable to resolve your account id from the auth token. Sign out and sign in again.'
  )
}

export async function findUserByClerkId(
  ctx: QueryCtx | MutationCtx,
  clerkId: string
): Promise<Doc<'users'> | null> {
  return await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', clerkId))
    .unique()
}

export async function findUserByIdentity(
  ctx: QueryCtx | MutationCtx,
  identity: AuthIdentity
): Promise<Doc<'users'> | null> {
  const clerkId = clerkIdFromIdentity(identity)
  return await findUserByClerkId(ctx, clerkId)
}

export async function ensureUserForIdentity(
  ctx: MutationCtx,
  identity: AuthIdentity
): Promise<Doc<'users'>> {
  const clerkId = clerkIdFromIdentity(identity)
  const existing = await findUserByClerkId(ctx, clerkId)
  const now = Date.now()

  if (existing) {
    const email = identity.email ?? existing.email
    const name = identity.name ?? existing.name
    if (email !== existing.email || name !== existing.name) {
      await ctx.db.patch(existing._id, {
        email,
        name,
        updatedAt: now,
      })
    }
    return { ...existing, email, name }
  }

  const email = identity.email ?? undefined
  const name = identity.name ?? undefined
  const userId = await ctx.db.insert('users', {
    clerkId,
    email,
    name,
    role: isBootstrapAdminEmail(email) ? 'admin' : 'candidate',
    createdAt: now,
    updatedAt: now,
  })
  const created = await ctx.db.get(userId)
  if (!created) {
    throw new ConvexError('Failed to create your profile.')
  }
  return created
}
