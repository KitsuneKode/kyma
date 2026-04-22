"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function parseCandidateLines(rawValue: string) {
  return rawValue
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [candidateName, candidateEmail] = line
        .split(",")
        .map((part) => part.trim());

      return {
        candidateName,
        candidateEmail: candidateEmail || undefined,
      };
    })
    .filter((candidate) => candidate.candidateName.length > 0);
}

export function ScreeningCreationForm() {
  const router = useRouter();
  const templates = useQuery(api.admin.listActiveTemplates);
  const createScreeningBatch = useMutation(api.admin.createScreeningBatch);
  const [batchName, setBatchName] = useState("Primary tutor screening");
  const [expiryDays, setExpiryDays] = useState("7");
  const [allowedAttempts, setAllowedAttempts] = useState("1");
  const [templateId, setTemplateId] = useState<Id<"assessmentTemplates"> | "">("");
  const [targetDurationMinutes, setTargetDurationMinutes] = useState("");
  const [allowsResume, setAllowsResume] = useState(true);
  const [candidateLines, setCandidateLines] = useState(
    "Aarav Mehta, aarav@example.com\nNaina Rao, naina@example.com",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (templates?.length && !templateId) {
      setTemplateId(templates[0].id);
    }
  }, [templates, templateId]);

  const parsedCandidates = useMemo(
    () => parseCandidateLines(candidateLines),
    [candidateLines],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (parsedCandidates.length === 0) {
      setError("Add at least one eligible candidate before creating a screening.");
      return;
    }

    setIsSubmitting(true);

    try {
      const durationParsed = Number.parseInt(targetDurationMinutes, 10);
      const batchId = await createScreeningBatch({
        name: batchName.trim() || "Tutor screening",
        allowedAttempts: Math.max(1, Number.parseInt(allowedAttempts, 10) || 1),
        expiresAt: new Date(
          Date.now() + 1000 * 60 * 60 * 24 * (Number.parseInt(expiryDays, 10) || 7),
        ).toISOString(),
        templateId: templateId || undefined,
        targetDurationMinutes: Number.isFinite(durationParsed)
          ? Math.max(5, durationParsed)
          : undefined,
        allowsResume,
        candidates: parsedCandidates,
      });

      startTransition(() => {
        router.push(`/admin/screenings/${batchId}`);
        router.refresh();
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create the screening.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field label="Assessment template" className="md:col-span-2 lg:col-span-3">
          <select
            value={templateId}
            onChange={(event) =>
              setTemplateId(event.target.value as Id<"assessmentTemplates">)
            }
            className={inputClasses}
            disabled={!templates?.length}
          >
            {templates?.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · rubric {template.rubricVersion}
                {template.targetDurationMinutes
                  ? ` · ${template.targetDurationMinutes} min default`
                  : ""}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">
            Batch-level duration and resume below override template defaults when set.
          </p>
        </Field>

        <Field label="Target duration override (minutes)">
          <input
            value={targetDurationMinutes}
            onChange={(event) => setTargetDurationMinutes(event.target.value)}
            inputMode="numeric"
            className={inputClasses}
            placeholder="Leave blank to use template default"
          />
        </Field>

        <div className="block">
          <span className="text-sm font-medium">Resume policy</span>
          <div className="mt-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowsResume}
                onChange={(event) => setAllowsResume(event.target.checked)}
              />
              Allow reconnect / resume when supported
            </label>
          </div>
        </div>

        <Field label="Screening name">
          <input
            value={batchName}
            onChange={(event) => setBatchName(event.target.value)}
            className={inputClasses}
            placeholder="Primary tutor screening"
          />
        </Field>

        <Field label="Expiry in days">
          <input
            value={expiryDays}
            onChange={(event) => setExpiryDays(event.target.value)}
            inputMode="numeric"
            className={inputClasses}
          />
        </Field>

        <Field label="Allowed attempts">
          <input
            value={allowedAttempts}
            onChange={(event) => setAllowedAttempts(event.target.value)}
            inputMode="numeric"
            className={inputClasses}
          />
        </Field>
      </div>

      <Field label="Eligible candidates">
        <textarea
          value={candidateLines}
          onChange={(event) => setCandidateLines(event.target.value)}
          className={cn(inputClasses, "min-h-56")}
          placeholder="Candidate Name, candidate@email.com"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          One candidate per line. Use `Name, email` format. Email is optional.
        </p>
      </Field>

      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-sm font-medium">Preview</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {parsedCandidates.length} eligible candidates will receive invite links tied
          to this screening batch.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create screening"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-sm font-medium">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputClasses =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
