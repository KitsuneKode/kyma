import { ConvexError } from "convex/values";

import type { MutationCtx, QueryCtx } from "../_generated/server";

function hasRecruiterAuthConfig() {
  return Boolean(
    process.env.CLERK_SECRET_KEY?.trim() &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
    (process.env.CLERK_FRONTEND_API_URL?.trim() ||
      process.env.CLERK_JWT_ISSUER_DOMAIN?.trim()),
  );
}

export async function requireRecruiterIdentity(ctx: QueryCtx | MutationCtx) {
  if (!hasRecruiterAuthConfig()) {
    return null;
  }

  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new ConvexError("You must be signed in to access recruiter data.");
  }

  return identity;
}

export async function getRecruiterActorId(ctx: QueryCtx | MutationCtx) {
  const identity = await requireRecruiterIdentity(ctx);

  return identity?.tokenIdentifier ?? identity?.subject ?? undefined;
}
