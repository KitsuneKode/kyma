"use client";

import { PreJoin, type LocalUserChoices } from "@livekit/components-react";

import { type InterviewSessionSnapshot } from "@/lib/interview/types";

type InviteLobbyProps = {
  candidateName: string;
  connectionError: string | null;
  initialSnapshot: InterviewSessionSnapshot;
  isBootstrapping: boolean;
  onSubmit: (choices: LocalUserChoices) => void | Promise<void>;
};

export function InviteLobby({
  candidateName,
  connectionError,
  initialSnapshot,
  isBootstrapping,
  onSubmit,
}: InviteLobbyProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Cuemath Tutor Screening
        </p>
        <h1 className="mt-3 max-w-xl text-balance text-3xl font-semibold tracking-tight">
          Join a real screening session with an AI interviewer.
        </h1>
        <p className="mt-3 max-w-xl text-pretty text-sm leading-6 text-muted-foreground">
          This first version is intentionally focused on a reliable interview flow: media check,
          live conversation, and durable session records for review. We are using the invite route
          as the product demo path, not as a fake simulator.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/80 bg-background/70 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Invite
            </p>
            <p className="mt-2 font-medium">{initialSnapshot.inviteId}</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-background/70 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Template
            </p>
            <p className="mt-2 font-medium">{initialSnapshot.templateName}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border/80 bg-background/70 p-5 shadow-sm">
          <p className="text-sm font-semibold">What to expect</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            <li>Short warm-up, explanation, and scenario-based questions</li>
            <li>Real-time voice and video room powered by LiveKit</li>
            <li>Post-call assessment with evidence-backed rubric output</li>
          </ul>
        </div>
      </section>

      <section className="relative rounded-2xl border border-border/80 bg-card/90 p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Prejoin
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Check your setup before joining</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Use the LiveKit prejoin flow to choose devices, preview media, and enter the room with
            the right settings.
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-background/80 p-4 shadow-sm">
          <PreJoin
            defaults={{
              username: candidateName,
              audioEnabled: true,
              videoEnabled: true,
            }}
            joinLabel={isBootstrapping ? "Preparing interview..." : "Join interview"}
            userLabel="Candidate name"
            persistUserChoices
            onSubmit={onSubmit}
            onError={(error) => {
              console.error("[kyma:prejoin] prejoin.error", error);
            }}
          />
        </div>

        {connectionError ? (
          <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {connectionError}
          </div>
        ) : null}

        {isBootstrapping ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/70 backdrop-blur-sm">
            <div className="rounded-2xl border border-border/80 bg-card px-4 py-3 text-sm font-medium shadow-sm">
              Preparing room and agent dispatch...
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
