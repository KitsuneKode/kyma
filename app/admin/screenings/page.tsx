import Link from "next/link";
import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { getServerConvexAuthToken } from "@/lib/clerk/server-token";
import { formatDateTime, formatStatusLabel } from "@/lib/recruiter/format";

export default async function AdminScreeningsPage() {
  const token = await getServerConvexAuthToken();
  const batches = process.env.NEXT_PUBLIC_CONVEX_URL
    ? await fetchQuery(
        api.admin.listScreeningBatches,
        {},
        {
          token: token ?? undefined,
        },
      ).catch(() => [])
    : [];

  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Screening Ops
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Screening batches
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Create invite-gated batches, control who is allowed to attempt the
              screening, and review progress without relying on the demo token.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/admin" />}
            >
              Back to admin
            </Button>
            <Button nativeButton={false} render={<Link href="/admin/screenings/new" />}>
              Create screening
            </Button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold">Batch list</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These are the operational entry points for controlled candidate access.
            </p>
          </div>
        </div>

        {batches.length === 0 ? (
          <div className="px-6 py-12 text-sm text-muted-foreground">
            No screening batches exist yet. Create one to generate invite links for a
            controlled candidate group.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Batch</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Candidates</th>
                  <th className="px-6 py-3 font-medium">Expiry</th>
                  <th className="px-6 py-3 font-medium">Template</th>
                  <th className="px-6 py-3 font-medium">Open</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id} className="border-t">
                    <td className="px-6 py-4">
                      <div className="font-medium">{batch.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Created {formatDateTime(batch.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">{formatStatusLabel(batch.status)}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {batch.completedCount} / {batch.candidateCount} submitted
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDateTime(batch.expiresAt)}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {batch.templateName}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        nativeButton={false}
                        size="sm"
                        render={<Link href={`/admin/screenings/${batch.id}`} />}
                      >
                        Open batch
                      </Button>
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
