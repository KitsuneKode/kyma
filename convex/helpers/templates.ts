import { ConvexError } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

import { DEFAULT_INTERVIEW_DURATION_MINUTES } from "./interviewPolicy";

export async function ensureDefaultTemplate(
  ctx: MutationCtx,
): Promise<Doc<"assessmentTemplates">> {
  const existingTemplate = await ctx.db
    .query("assessmentTemplates")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .first();

  if (existingTemplate) {
    return existingTemplate;
  }

  const templateId = await ctx.db.insert("assessmentTemplates", {
    name: "AI Tutor Screener",
    role: "teacher",
    status: "active",
    createdBy: "system",
    rubricVersion: "v1",
    targetDurationMinutes: DEFAULT_INTERVIEW_DURATION_MINUTES,
    allowsResume: true,
    interviewStyleMode: "standard",
  });

  const template = await ctx.db.get(templateId);

  if (!template) {
    throw new ConvexError("Unable to create default template.");
  }

  return template;
}
