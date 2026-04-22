"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/recruiter/format";
import { cn } from "@/lib/utils";

type RecruiterNote = {
  id: string;
  body: string;
  authorId?: string;
  createdAt: string;
};

export function RecruiterNotes({
  sessionId,
  reportId,
  notes,
}: {
  sessionId: string;
  reportId?: string;
  notes: RecruiterNote[];
}) {
  const router = useRouter();
  const addRecruiterNote = useMutation(api.admin.addRecruiterNote);
  const [value, setValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!value.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      await addRecruiterNote({
        sessionId: sessionId as Id<"interviewSessions">,
        reportId: reportId as Id<"assessmentReports"> | undefined,
        body: value.trim(),
      });
      setValue("");
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {notes.length ? (
          notes.map((note) => (
            <div key={note.id} className="rounded-lg border px-4 py-3">
              <p className="text-sm leading-6">{note.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDateTime(note.createdAt)}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No recruiter notes have been saved yet.
          </p>
        )}
      </div>

      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Capture your recruiter observations here."
        className={cn(
          "min-h-28 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
      />

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save note"}
        </Button>
      </div>
    </div>
  );
}
