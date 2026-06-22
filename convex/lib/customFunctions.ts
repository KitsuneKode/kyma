import {
  customMutation,
  customQuery,
} from 'convex-helpers/server/customFunctions'

import { mutation, query } from '../_generated/server'
import {
  requireAdmin,
  requireOrgId,
  requireRecruiterContext,
  type RecruiterCapability,
  requireRecruiterMember,
} from '../helpers/auth'

export function recruiterQueryWithCapability(capability: RecruiterCapability) {
  return customQuery(query, {
    args: {},
    input: async (ctx, args) => {
      const { orgId } = await requireRecruiterContext(ctx, capability)
      return { ctx: { ...ctx, orgId }, args }
    },
  })
}

export function recruiterMutationWithCapability(
  capability: RecruiterCapability
) {
  return customMutation(mutation, {
    args: {},
    input: async (ctx, args) => {
      const { orgId } = await requireRecruiterContext(ctx, capability)
      return { ctx: { ...ctx, orgId }, args }
    },
  })
}

export const recruiterQuery = customQuery(query, {
  args: {},
  input: async (ctx, args) => {
    await requireRecruiterMember(ctx)
    const orgId = await requireOrgId(ctx)
    return { ctx: { ...ctx, orgId }, args }
  },
})

export const candidateReadQuery = recruiterQueryWithCapability(
  'recruiter:candidates:read'
)

export const candidateWriteMutation = recruiterMutationWithCapability(
  'recruiter:candidates:write'
)

export const screeningWriteMutation = recruiterMutationWithCapability(
  'recruiter:screenings:write'
)

export const templateWriteMutation = recruiterMutationWithCapability(
  'recruiter:templates:write'
)

export const settingsWriteMutation = recruiterMutationWithCapability(
  'recruiter:settings:write'
)

export const recruiterMutation = customMutation(mutation, {
  args: {},
  input: async (ctx, args) => {
    await requireRecruiterMember(ctx)
    const orgId = await requireOrgId(ctx)
    return { ctx: { ...ctx, orgId }, args }
  },
})

export const adminQuery = customQuery(query, {
  args: {},
  input: async (ctx, args) => {
    const { identity } = await requireAdmin(ctx)
    const orgId = await requireOrgId(ctx)
    return { ctx: { ...ctx, orgId, actor: identity.subject }, args }
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
