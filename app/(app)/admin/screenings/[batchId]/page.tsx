import Link from "next/link";
import { fetchQuery } from "convex/nextjs";

import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { getServerConvexAuthToken } from "@/lib/clerk/server-token";
import { formatDateTime, formatStatusLabel } from "@/lib/recruiter/format";
import { env } from "@/lib/env";

type ScreeningDetailPageProps = {
  params: Promise<{
    batchId: string;
  }>;
};

export default async function ScreeningDetailPage({
  params,
}: ScreeningDetailPageProps) {
  const { batchId } = await params;
  const token = await getServerConvexAuthToken();
  const detail = env.NEXT_PUBLIC_CONVEX_URL
    ? await fetchQuery(
        api.admin.getScreeningBatchDetail,
        {
          batchId: batchId as Id<"screeningBatches">,
        },
        {
          token: token ?? undefined,
        },
      ).catch(() => null)
    : null;

  if (!detail) {
    return (
      <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-5xl flex-col gap-6 px-6 py-10">
        <section className="rounded-xl border bg-card p-8 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight">
            Screening batch not found
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The batch may not exist yet, or Convex is unavailable in this environment.
          </p>
          <div className="mt-6">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/admin/screenings" />}
            >
              Back to screenings
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Screening Ops
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {detail.batch.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              This batch controls who is allowed to access the interview and how many
              attempts they get before the invite flow is closed.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/admin/screenings" />}
            >
              Back to screenings
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Status" value={formatStatusLabel(detail.batch.status)} />
        <MetricCard
          label="Template"
          value={detail.batch.templateName}
          detail="Current assessment template"
        />
        <MetricCard
          label="Attempts"
          value={String(detail.batch.allowedAttempts)}
          detail="Allowed attempts per candidate"
        />
        <MetricCard
          label="Expiry"
          value={formatDateTime(detail.batch.expiresAt)}
          detail="Invite expiration"
        />
      </section>

      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold">Eligible candidates</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Share these invite links only with the allowed candidates.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Candidate</th>
                <th className="px-6 py-3 font-medium">Eligibility</th>
                <th className="px-6 py-3 font-medium">Attempts</th>
                <th className="px-6 py-3 font-medium">Invite</th>
              </tr>
            </thead>
            <tbody>
              {detail.candidates.map((candidate) => (
                <tr key={candidate.id} className="border-t">
                  <td className="px-6 py-4">
                    <div className="font-medium">{candidate.candidateName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {candidate.candidateEmail ?? "No email captured"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>{formatStatusLabel(candidate.status)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Invite {formatStatusLabel(candidate.inviteStatus)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {candidate.attemptCount} / {candidate.allowedAttempts}
                  </td>
                  <td className="px-6 py-4">
                    {candidate.inviteToken ? (
                      <div className="flex flex-col gap-2">
                        <code className="rounded bg-muted/40 px-2 py-1 text-xs">
                          /interviews/{candidate.inviteToken}
                        </code>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  detail?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-3 text-xl font-semibold tracking-tight">{value}</p>
      {detail ? <p className="mt-2 text-sm text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
