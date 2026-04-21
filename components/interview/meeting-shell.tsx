"use client";

import {
  LiveKitRoom,
  VideoConference,
  type LocalUserChoices,
} from "@livekit/components-react";
import { type DisconnectReason, type Room } from "livekit-client";

import { Button } from "@/components/ui/button";
import { type BootstrappedInterviewSession } from "@/lib/interview/bootstrap";

type MeetingShellProps = {
  connectionError: string | null;
  isSubmittingInterview: boolean;
  onConnected: () => void;
  onDisconnected?: (reason?: DisconnectReason) => void;
  onError: (error: Error) => void;
  onSubmitInterview: () => void | Promise<void>;
  preJoinChoices: LocalUserChoices;
  room: Room;
  session: BootstrappedInterviewSession;
};

export function MeetingShell({
  connectionError,
  isSubmittingInterview,
  onConnected,
  onDisconnected,
  onError,
  onSubmitInterview,
  preJoinChoices,
  room,
  session,
}: MeetingShellProps) {
  return (
    <div className="kyma-meeting-shell rounded-2xl border border-border/80 bg-card/90 p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/70 px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Live Interview
          </p>
          <p className="mt-1 text-sm font-medium">
            Submit the interview when the conversation is complete. If the built-in leave control is
            used first, the session will be marked as interrupted.
          </p>
        </div>
        <Button onClick={onSubmitInterview} disabled={isSubmittingInterview}>
          {isSubmittingInterview ? "Submitting..." : "Submit Interview"}
        </Button>
      </div>

      <div
        data-lk-theme="default"
        className="overflow-hidden rounded-2xl border border-border/80 bg-background shadow-sm"
      >
        <LiveKitRoom
          room={room}
          token={session.token}
          serverUrl={session.wsUrl}
          connect
          audio={preJoinChoices.audioEnabled}
          video={preJoinChoices.videoEnabled}
          onConnected={onConnected}
          onDisconnected={onDisconnected}
          onError={onError}
          className="h-[720px]"
        >
          <VideoConference className="h-full" />
        </LiveKitRoom>
      </div>

      {connectionError ? (
        <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {connectionError}
        </div>
      ) : null}
    </div>
  );
}
