"use client";

import { type TranscriptSegment } from "@/lib/interview/types";

type TranscriptRailProps = {
  transcript: TranscriptSegment[];
};

export function TranscriptRail({ transcript }: TranscriptRailProps) {
  return (
    <section className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-sm">
      <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        Transcript
      </p>
      <div className="mt-4 space-y-3">
        {transcript.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-background/50 px-4 py-4 text-sm leading-6 text-muted-foreground">
            Transcript segments will appear here once the agent runtime or post-call
            processing writes real transcription data.
          </div>
        ) : (
          transcript.map((segment) => (
            <div
              key={segment.id}
              className="rounded-xl border border-border/80 bg-background/70 px-4 py-3 shadow-sm"
            >
              <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
                {segment.speaker}
              </p>
              <p className="mt-2 text-sm leading-6">{segment.text}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
