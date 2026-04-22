import type { MutationCtx } from "../_generated/server";

export async function logAuditEvent(
  ctx: MutationCtx,
  args: {
    actorId?: string;
    action: string;
    resource: string;
    metadata?: Record<string, unknown>;
  },
) {
  await ctx.db.insert("auditEvents", {
    actorId: args.actorId,
    action: args.action,
    resource: args.resource,
    metadataJson: args.metadata ? JSON.stringify(args.metadata) : undefined,
    createdAt: new Date().toISOString(),
  });
}
