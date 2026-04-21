import Link from "next/link";

import { Button } from "@/components/ui/button";
import { REALTIME_PROVIDER } from "@/lib/realtime/provider";

const pillars = [
  {
    title: "Realtime interview loop",
    body: "Get one candidate and one interviewer agent talking reliably before widening scope.",
  },
  {
    title: "Session durability",
    body: "Persist invite, room, lifecycle, transcript, and processing state with clean transitions.",
  },
  {
    title: "Post-call assessment",
    body: "Generate a structured report only after the transcript and session state stabilize.",
  },
];

export default function Page() {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-65px)] w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="rounded-2xl border bg-card p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Kyma
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight">
          Reliable realtime tutor screening, built from the session model outward.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
          The product is deliberately biased toward correctness, reconnect safety, and transcript
          durability before design polish or secondary features.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link href="/interviews/demo-invite" />}>
            Open Candidate Flow
          </Button>
          <Button nativeButton={false} variant="outline" render={<Link href="/admin" />}>
            Open Admin Shell
          </Button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-sm font-semibold">Current Stack Direction</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between gap-4 rounded-lg border px-4 py-3">
                <dt className="text-muted-foreground">Realtime provider</dt>
                <dd className="font-medium capitalize">{REALTIME_PROVIDER.name}</dd>
              </div>
              <div className="flex justify-between gap-4 rounded-lg border px-4 py-3">
                <dt className="text-muted-foreground">Transport</dt>
                <dd className="font-medium uppercase">{REALTIME_PROVIDER.transport}</dd>
              </div>
              <div className="flex justify-between gap-4 rounded-lg border px-4 py-3">
                <dt className="text-muted-foreground">Backend source of truth</dt>
                <dd className="font-medium">Convex</dd>
              </div>
              <div className="flex justify-between gap-4 rounded-lg border px-4 py-3">
                <dt className="text-muted-foreground">Background processing</dt>
                <dd className="font-medium">Inngest</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold">Execution Pillars</h2>
          <div className="mt-4 space-y-3">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="rounded-lg border px-4 py-4">
                <p className="text-sm font-medium">{pillar.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
