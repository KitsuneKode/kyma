"use client";

import { type InterviewSessionSnapshot } from "@/lib/interview/types";
import { getSessionStateLabel } from "@/lib/interview/session-machine";

type SessionOverviewProps = {
  connectionError: string | null;
  snapshot: InterviewSessionSnapshot;
};

export function SessionOverview({ connectionError, snapshot }: SessionOverviewProps) {
  return (
    <section className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Session
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">{snapshot.templateName}</h2>
        </div>
        <div className="rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium">
          {getSessionStateLabel(snapshot.state)}
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm">
        <div className="flex justify-between gap-4 rounded-xl border border-border/80 bg-background/70 px-4 py-3">
          <span className="text-muted-foreground">Candidate</span>
          <span className="font-medium">{snapshot.candidateName ?? "Not provided yet"}</span>
        </div>
        <div className="flex justify-between gap-4 rounded-xl border border-border/80 bg-background/70 px-4 py-3">
          <span className="text-muted-foreground">Invite</span>
          <span className="font-medium">{snapshot.inviteId}</span>
        </div>
        <div className="flex justify-between gap-4 rounded-xl border border-border/80 bg-background/70 px-4 py-3">
          <span className="text-muted-foreground">Room</span>
          <span className="font-medium">{snapshot.roomName ?? "Not connected yet"}</span>
        </div>
        <div className="flex justify-between gap-4 rounded-xl border border-border/80 bg-background/70 px-4 py-3">
          <span className="text-muted-foreground">Session</span>
          <span className="font-medium">{snapshot.sessionId ?? "Not created yet"}</span>
        </div>
      </div>

      {connectionError ? (
        <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {connectionError}
        </div>
      ) : null}
    </section>
  );
}
