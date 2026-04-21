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

  const snapshot: InterviewSessionSnapshot = {
    inviteId,
    templateName: "AI Tutor Screener",
    state: "ready",
    events: [
      {
        type: "invite-opened",
        detail: "Candidate opened the interview invite.",
        createdAt: new Date().toISOString(),
      },
    ],
    preflight: createDefaultPreflightSteps(),
    transcript: [],
  };

  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-6xl flex-col px-6 py-10">
      <InterviewWorkspace initialSnapshot={snapshot} />
    </main>
  );
}
