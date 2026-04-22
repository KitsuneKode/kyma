import { z } from "zod";

export const bootstrapBodySchema = z.object({
  inviteToken: z.string().min(1),
  participantName: z.string().min(2),
});

export const reportChatBodySchema = z.object({
  sessionId: z.string().min(1),
  reportId: z.string().optional(),
  question: z.string().min(1),
});
