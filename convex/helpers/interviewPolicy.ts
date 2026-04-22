import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export const DEFAULT_INTERVIEW_DURATION_MINUTES = 18;

export type InterviewPolicy = {
  durationMode: "timed";
  targetDurationMinutes: number;
  allowsResume: boolean;
  maxAttempts: number;
  expiresAt?: string;
  rubricVersion: string;
  templateName?: string;
  interviewStyleMode?: "standard" | "intensive";
};

export type InterviewPolicySnapshot = {
  targetDurationMinutes: number;
  allowsResume: boolean;
  maxAttempts: number;
  rubricVersion: string;
  templateId: string;
  templateName?: string;
  interviewStyleMode?: "standard" | "intensive";
};

export async function resolveInterviewPolicyFromInvite(
  ctx: QueryCtx | MutationCtx,
  invite: Doc<"candidateInvites">,
): Promise<{ policy: InterviewPolicy; snapshot: InterviewPolicySnapshot }> {
  const template = await ctx.db.get(invite.templateId);
  const batch = invite.batchId ? await ctx.db.get(invite.batchId) : null;
  const eligibility = invite.eligibilityId
    ? await ctx.db.get(invite.eligibilityId)
    : null;

  const targetDurationMinutes =
    batch?.targetDurationMinutes ??
    template?.targetDurationMinutes ??
    DEFAULT_INTERVIEW_DURATION_MINUTES;

  const allowsResume = batch?.allowsResume ?? template?.allowsResume ?? true;

  const maxAttempts = eligibility?.allowedAttempts ?? batch?.allowedAttempts ?? 1;

  const rubricVersion = template?.rubricVersion ?? "v1";
  const interviewStyleMode = template?.interviewStyleMode ?? ("standard" as const);

  const policy: InterviewPolicy = {
    durationMode: "timed",
    targetDurationMinutes,
    allowsResume,
    maxAttempts,
    expiresAt: invite.expiresAt,
    rubricVersion,
    templateName: template?.name,
    interviewStyleMode,
  };

  const snapshot: InterviewPolicySnapshot = {
    targetDurationMinutes,
    allowsResume,
    maxAttempts,
    rubricVersion,
    templateId: `${invite.templateId}`,
    templateName: template?.name,
    interviewStyleMode,
  };

  return { policy, snapshot };
}
