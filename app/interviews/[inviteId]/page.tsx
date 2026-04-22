import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import { InterviewWorkspace } from "@/components/interview/interview-workspace";
import { createInitialInterviewSnapshot } from "@/lib/interview/snapshot";

type InterviewPageProps = {
  params: Promise<{
    inviteId: string;
  }>;
};

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { inviteId } = await params;
  const publicSnapshot = process.env.NEXT_PUBLIC_CONVEX_URL
    ? await fetchQuery(api.interviews.getPublicSessionDetail, {
        inviteToken: inviteId,
      }).catch(() => null)
    : null;

  const snapshot = createInitialInterviewSnapshot(
    inviteId,
    publicSnapshot,
    !publicSnapshot && inviteId !== "demo-invite"
      ? {
          accessState: "unavailable",
          accessMessage:
            "This interview link is invalid, revoked, or not yet ready. Please confirm the link with the recruiter.",
        }
      : undefined,
  );

  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-6xl flex-col px-6 py-10">
      <InterviewWorkspace initialSnapshot={snapshot} />
    </main>
  );
}
