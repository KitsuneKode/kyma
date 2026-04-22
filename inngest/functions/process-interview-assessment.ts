import { z } from "zod";

import type { Id } from "@/convex/_generated/dataModel";
import {
  markAssessmentFailed,
  markAssessmentProcessing,
  processInterviewAssessment,
} from "@/lib/assessment/process-session";

import { inngest } from "../client";

const payloadSchema = z.object({
  sessionId: z.string(),
});

export const processInterviewAssessmentFunction = inngest.createFunction(
  {
    id: "process-interview-assessment",
    name: "Process interview assessment",
    retries: 1,
    triggers: {
      event: "kyma/interview.processing.requested",
    },
  },
  async ({ event, step }) => {
    const { sessionId } = payloadSchema.parse(event.data);
    const typedSessionId = sessionId as Id<"interviewSessions">;

    await step.run("mark-report-processing", async () => {
      await markAssessmentProcessing(typedSessionId);
    });

    try {
      return await step.run("generate-assessment-report", async () => {
        return await processInterviewAssessment(typedSessionId, "inngest");
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Assessment processing failed unexpectedly.";

      await step.run("mark-report-failed", async () => {
        await markAssessmentFailed(typedSessionId, message);
      });

      throw error;
    }
  },
);
