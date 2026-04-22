import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { getRecruiterActorId, requireRecruiterIdentity } from "./helpers/auth";
import { logAuditEvent } from "./helpers/audit";
import { ensureDefaultTemplate } from "./helpers/templates";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildInviteToken(candidateName: string) {
  const prefix = slugify(candidateName) || "candidate";
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now()}`;

  return `${prefix}-${suffix}`;
}

export const listActiveTemplates = query({
  args: {},
  handler: async (ctx) => {
    await requireRecruiterIdentity(ctx);

    const templates = await ctx.db
      .query("assessmentTemplates")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return templates
      .toSorted((left, right) => left.name.localeCompare(right.name))
      .map((template) => ({
        id: template._id,
        name: template.name,
        role: template.role,
        rubricVersion: template.rubricVersion,
        targetDurationMinutes: template.targetDurationMinutes,
        allowsResume: template.allowsResume,
        interviewStyleMode: template.interviewStyleMode,
      }));
  },
});

export const listScreeningBatches = query({
  args: {},
  handler: async (ctx) => {
    await requireRecruiterIdentity(ctx);

    const batches = await ctx.db.query("screeningBatches").collect();

    return await Promise.all(
      [...batches]
        .toSorted((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map(async (batch) => {
          const [template, eligibility] = await Promise.all([
            ctx.db.get(batch.templateId),
            ctx.db
              .query("candidateEligibility")
              .withIndex("by_batch", (q) => q.eq("batchId", batch._id))
              .collect(),
          ]);

          return {
            id: batch._id,
            name: batch.name,
            status: batch.status,
            createdAt: batch.createdAt,
            expiresAt: batch.expiresAt,
            allowedAttempts: batch.allowedAttempts,
            templateName: template?.name ?? "AI Tutor Screener",
            targetDurationMinutes: batch.targetDurationMinutes,
            allowsResume: batch.allowsResume,
            candidateCount: eligibility.length,
            completedCount: eligibility.filter(
              (candidate) => candidate.status === "submitted",
            ).length,
          };
        }),
    );
  },
});

export const getScreeningBatchDetail = query({
  args: {
    batchId: v.id("screeningBatches"),
  },
  handler: async (ctx, { batchId }) => {
    await requireRecruiterIdentity(ctx);

    const batch = await ctx.db.get(batchId);

    if (!batch) {
      return null;
    }

    const [template, eligibility] = await Promise.all([
      ctx.db.get(batch.templateId),
      ctx.db
        .query("candidateEligibility")
        .withIndex("by_batch", (q) => q.eq("batchId", batchId))
        .collect(),
    ]);

    const candidates = await Promise.all(
      eligibility.map(async (item) => {
        const invite = await ctx.db.get(item.inviteId);
        return {
          id: item._id,
          candidateName: item.candidateName,
          candidateEmail: item.candidateEmail,
          allowedAttempts: item.allowedAttempts,
          attemptCount: item.attemptCount,
          status: item.status,
          inviteToken: invite?.inviteToken,
          inviteStatus: invite?.status ?? "created",
          expiresAt: invite?.expiresAt,
        };
      }),
    );

    return {
      batch: {
        id: batch._id,
        name: batch.name,
        status: batch.status,
        createdAt: batch.createdAt,
        expiresAt: batch.expiresAt,
        allowedAttempts: batch.allowedAttempts,
        targetDurationMinutes: batch.targetDurationMinutes,
        allowsResume: batch.allowsResume,
        templateName: template?.name ?? "AI Tutor Screener",
      },
      candidates: candidates.toSorted((left, right) =>
        left.candidateName.localeCompare(right.candidateName),
      ),
    };
  },
});

export const createScreeningBatch = mutation({
  args: {
    name: v.string(),
    createdBy: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    allowedAttempts: v.number(),
    templateId: v.optional(v.id("assessmentTemplates")),
    targetDurationMinutes: v.optional(v.number()),
    allowsResume: v.optional(v.boolean()),
    candidates: v.array(
      v.object({
        candidateName: v.string(),
        candidateEmail: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const createdBy = await getRecruiterActorId(ctx);
    const template = args.templateId
      ? await ctx.db.get(args.templateId)
      : await ensureDefaultTemplate(ctx);

    if (!template) {
      throw new ConvexError("Assessment template not found.");
    }

    const now = new Date().toISOString();
    const batchId = await ctx.db.insert("screeningBatches", {
      name: args.name,
      templateId: template._id,
      createdBy: createdBy ?? args.createdBy ?? "admin",
      status: "active",
      expiresAt: args.expiresAt,
      allowedAttempts: args.allowedAttempts,
      targetDurationMinutes: args.targetDurationMinutes,
      allowsResume: args.allowsResume,
      createdAt: now,
    });

    for (const candidate of args.candidates) {
      const inviteId = await ctx.db.insert("candidateInvites", {
        inviteToken: buildInviteToken(candidate.candidateName),
        candidateName: candidate.candidateName,
        candidateEmail: candidate.candidateEmail,
        templateId: template._id,
        batchId,
        status: "created",
        expiresAt:
          args.expiresAt ??
          new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      });

      const eligibilityId = await ctx.db.insert("candidateEligibility", {
        batchId,
        inviteId,
        candidateName: candidate.candidateName,
        candidateEmail: candidate.candidateEmail,
        allowedAttempts: args.allowedAttempts,
        attemptCount: 0,
        status: "invited",
        createdAt: now,
      });

      await ctx.db.patch(inviteId, {
        eligibilityId,
      });
    }

    return batchId;
  },
});

export const addRecruiterNote = mutation({
  args: {
    sessionId: v.id("interviewSessions"),
    reportId: v.optional(v.id("assessmentReports")),
    authorId: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const authorId = await getRecruiterActorId(ctx);

    const noteId = await ctx.db.insert("recruiterNotes", {
      ...args,
      authorId: authorId ?? args.authorId,
      createdAt: new Date().toISOString(),
    });

    await logAuditEvent(ctx, {
      actorId: authorId ?? args.authorId ?? undefined,
      action: "recruiter_note.created",
      resource: `session:${args.sessionId}`,
      metadata: { noteId },
    });

    return noteId;
  },
});

export const addReportChatMessage = mutation({
  args: {
    sessionId: v.id("interviewSessions"),
    reportId: v.optional(v.id("assessmentReports")),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    answerSource: v.optional(v.union(v.literal("fallback"), v.literal("model"))),
    modelId: v.optional(v.string()),
    citationsJson: v.optional(v.string()),
    groundingVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRecruiterIdentity(ctx);

    return await ctx.db.insert("reportChatMessages", {
      ...args,
      createdAt: new Date().toISOString(),
    });
  },
});
