const DIMENSION_LABELS: Record<string, string> = {
  clarity: "Clarity",
  simplification: "Simplification",
  patience: "Patience",
  warmth: "Warmth",
  listening: "Listening",
  fluency: "Fluency",
  adaptability: "Adaptability",
  engagement: "Engagement",
  accuracy: "Accuracy",
}

const RECOMMENDATION_LABELS: Record<string, string> = {
  strong_yes: "Strong yes",
  yes: "Yes",
  mixed: "Mixed",
  no: "No",
}

const STATUS_LABELS: Record<string, string> = {
  created: "Created",
  opened: "Opened",
  in_progress: "In progress",
  completed: "Completed",
  expired: "Expired",
  ready: "Ready",
  connecting: "Connecting",
  live: "Live",
  reconnecting: "Reconnecting",
  interrupted: "Interrupted",
  "teaching-simulation-started": "Teaching simulation started",
  "teaching-simulation-completed": "Teaching simulation completed",
  "candidate-screen-share-started": "Candidate screen share started",
  "candidate-screen-share-stopped": "Candidate screen share stopped",
  processing: "Processing",
  failed: "Failed",
  pending: "Pending",
  manual_review: "Manual review",
  advance: "Advance",
  reject: "Reject",
  hold: "Hold",
}

export function formatDimensionLabel(dimension: string) {
  return DIMENSION_LABELS[dimension] ?? humanizeToken(dimension)
}

export function formatRecommendationLabel(recommendation?: string | null) {
  if (!recommendation) {
    return "Pending"
  }

  return RECOMMENDATION_LABELS[recommendation] ?? humanizeToken(recommendation)
}

export function formatStatusLabel(status?: string | null) {
  if (!status) {
    return "Unknown"
  }

  return STATUS_LABELS[status] ?? humanizeToken(status)
}

export function formatConfidenceLabel(confidence?: string | null) {
  if (!confidence) {
    return "Pending"
  }

  return humanizeToken(confidence)
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not available"
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

function humanizeToken(value: string) {
  return value
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
