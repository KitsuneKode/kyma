import { type TranscriptSegment } from "@/lib/interview/types";

export function upsertTranscriptSegment(
  segments: TranscriptSegment[],
  incoming: TranscriptSegment,
) {
  const existingIndex = segments.findIndex((segment) => segment.id === incoming.id);

  if (existingIndex === -1) {
    return [...segments, incoming];
  }

  return segments.map((segment, index) =>
    index === existingIndex ? mergeTranscriptSegments(segment, incoming) : segment,
  );
}

export function mergeTranscriptSegments(
  current: TranscriptSegment,
  incoming: TranscriptSegment,
) {
  return {
    ...current,
    ...incoming,
    status: incoming.status,
    text: incoming.text || current.text,
  };
}

export function getStableTranscript(segments: TranscriptSegment[]) {
  return segments
    .filter((segment) => segment.status === "final")
    .sort((left, right) => left.startedAt.localeCompare(right.startedAt));
}
