import { type InterviewPolicy } from "@/lib/interview/types";

export const DEFAULT_INTERVIEW_POLICY: InterviewPolicy = {
  durationMode: "timed",
  targetDurationMinutes: 18,
  allowsResume: true,
  maxAttempts: 1,
};

export function formatDurationPolicy(policy: InterviewPolicy) {
  if (policy.durationMode === "flexible") {
    return "Flexible duration";
  }

  if (!policy.targetDurationMinutes) {
    return "Timed interview";
  }

  return `${policy.targetDurationMinutes} min target`;
}

export function formatExpiryLabel(expiresAt?: string) {
  if (!expiresAt) {
    return "No expiry set";
  }

  const parsed = Date.parse(expiresAt);

  if (Number.isNaN(parsed)) {
    return "Expiry unavailable";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}
