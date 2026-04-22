import Link from "next/link";
import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { getServerConvexAuthToken } from "@/lib/clerk/server-token";
import {
  formatConfidenceLabel,
  formatDateTime,
  formatRecommendationLabel,
  formatStatusLabel,
} from "@/lib/recruiter/format";
import { env } from "@/lib/env";

export default async function AdminCandidatesPage() {
  const token = await getServerConvexAuthToken();
  const candidates = env.NEXT_PUBLIC_CONVEX_URL
    ? await fetchQuery(
        api.recruiter.listReviewCandidates,
        {},
        {
          token: token ?? undefined,
        },
      ).catch(() => [])
    : [];

  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Recruiter Workspace
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Candidate review queue
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              This is the first real recruiter-side surface: sessions, recommendations,
              confidence, and review state in one place. The design is intentionally
              minimal for now so we can stabilize the product flow before polish.
            </p>
          </div>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/admin" />}
          >
            Back to Admin
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Sessions"
          value={String(candidates.length)}
          detail="Total sessions captured so far."
        />
        <MetricCard
          label="Reports Ready"
          value={String(
            candidates.filter((candidate) => candidate.reportStatus === "completed")
              .length,
          )}
          detail="Completed assessment reports."
        />
        <MetricCard
          label="Manual Review"
          value={String(
            candidates.filter(
              (candidate) =>
                candidate.reportStatus === "manual_review" ||
                candidate.latestDecision === "manual_review",
            ).length,
          )}
          detail="Candidates needing a human call."
        />
        <MetricCard
          label="Strong Signals"
          value={String(
            candidates.filter((candidate) => candidate.recommendation === "strong_yes")
              .length,
          )}
          detail="Candidates currently standing out."
        />
      </section>

      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold">Review queue</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use this table to triage who to review first and who still needs a report.
            </p>
          </div>
        </div>

        {candidates.length === 0 ? (
          <div className="px-6 py-12 text-sm text-muted-foreground">
            No completed sessions are available yet. Run a candidate interview first,
            then come back here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Candidate</th>
                  <th className="px-6 py-3 font-medium">Session</th>
                  <th className="px-6 py-3 font-medium">Report</th>
                  <th className="px-6 py-3 font-medium">Recommendation</th>
                  <th className="px-6 py-3 font-medium">Confidence</th>
                  <th className="px-6 py-3 font-medium">Signals</th>
                  <th className="px-6 py-3 font-medium">Review</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr key={candidate.sessionId} className="border-t align-top">
                    <td className="px-6 py-4">
                      <div className="font-medium">{candidate.candidateName}</div>
                      <div className="mt-1 text-muted-foreground">
                        {candidate.templateName}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Invite: {candidate.inviteToken ?? "Unavailable"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div>{formatStatusLabel(candidate.sessionState)}</div>
                      <div className="mt-1 text-xs">
                        Started {formatDateTime(candidate.startedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div>{formatStatusLabel(candidate.reportStatus)}</div>
                      {typeof candidate.weightedScore === "number" ? (
                        <div className="mt-1 text-xs">
                          Weighted score {candidate.weightedScore.toFixed(1)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">
                        {formatRecommendationLabel(candidate.recommendation)}
                      </div>
                      {candidate.hardGateTriggered ? (
                        <div className="mt-1 text-xs text-destructive">
                          Hard gate triggered
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      {formatConfidenceLabel(candidate.confidence)}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex flex-col gap-1">
                        <span>
                          Strengths:{" "}
                          {candidate.topStrengths.length
                            ? candidate.topStrengths.slice(0, 2).join(", ")
                            : "Pending"}
                        </span>
                        <span>
                          Concerns:{" "}
                          {candidate.topConcerns.length
                            ? candidate.topConcerns.slice(0, 2).join(", ")
                            : "Pending"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="text-muted-foreground">
                          {candidate.latestDecision
                            ? formatStatusLabel(candidate.latestDecision)
                            : "Not reviewed"}
                        </div>
                        <Button
                          nativeButton={false}
                          size="sm"
                          render={
                            <Link href={`/admin/candidates/${candidate.sessionId}`} />
                          }
                        >
                          Open review
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
