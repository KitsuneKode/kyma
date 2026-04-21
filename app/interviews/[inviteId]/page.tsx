import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import { InterviewWorkspace } from "@/components/interview/interview-workspace";
import { createDefaultPreflightSteps } from "@/lib/interview/preflight";
import { type InterviewSessionSnapshot } from "@/lib/interview/types";

type InterviewPageProps = {
  params: Promise<{
    inviteId: string;
  }>;
};

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { inviteId } = await params;
  const publicSnapshot =
    process.env.NEXT_PUBLIC_CONVEX_URL
      ? await fetchQuery(api.interviews.getPublicInterviewSnapshot, {
          inviteToken: inviteId,
        }).catch(() => null)
      : null;

  const snapshot: InterviewSessionSnapshot = {
    inviteId,
    sessionId: publicSnapshot?.sessionId,
    candidateName: publicSnapshot?.candidateName,
    templateName: publicSnapshot?.templateName ?? "AI Tutor Screener",
    state: publicSnapshot?.state ?? "ready",
    roomName: publicSnapshot?.roomName,
    events:
      publicSnapshot?.events.length
        ? publicSnapshot.events
        : [
            {
              type: "invite-opened",
              detail: "Candidate opened the interview invite.",
              createdAt: new Date().toISOString(),
            },
          ],
    preflight: createDefaultPreflightSteps(),
    transcript: publicSnapshot?.transcript ?? [],
  };

  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-6xl flex-col px-6 py-10">
      <InterviewWorkspace initialSnapshot={snapshot} />
    </main>
  );
}
