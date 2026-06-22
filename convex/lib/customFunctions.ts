import {
  customMutation,
  customQuery,
} from 'convex-helpers/server/customFunctions'

import { mutation, query } from '../_generated/server'
import {
  requireAdmin,
  requireAdminIdentity,
  requireOrgId,
} from '../helpers/auth'

export const recruiterQuery = customQuery(query, {
  args: {},
  input: async (ctx, args) => {
    await requireAdminIdentity(ctx)
    const orgId = await requireOrgId(ctx)
    return { ctx: { ...ctx, orgId }, args }
  },
})

export const recruiterMutation = customMutation(mutation, {
  args: {},
  input: async (ctx, args) => {
    await requireAdminIdentity(ctx)
    const orgId = await requireOrgId(ctx)
    return { ctx: { ...ctx, orgId }, args }
  },
})

export const orgAdminMutation = customMutation(mutation, {
  args: {},
  input: async (ctx, args) => {
    const { identity } = await requireAdmin(ctx)
    const orgId = await requireOrgId(ctx)
    const actor = identity?.tokenIdentifier ?? identity?.subject ?? 'admin'
    return { ctx: { ...ctx, orgId, actor }, args }
  },
})
