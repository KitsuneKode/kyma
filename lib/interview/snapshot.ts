import {
  PRE_FLIGHT_STEPS,
  type InviteAccessState,
  type InterviewPolicy,
  type InterviewSessionSnapshot,
  type InterviewSessionState,
  type PreflightStep,
  type SessionEvent,
  type SessionEventType,
  type TranscriptSegment,
  type TranscriptSegmentSpeaker,
  type TranscriptSegmentStatus,
  type RecordingArtifact,
} from "@/lib/interview/types";
import { DEFAULT_INTERVIEW_POLICY } from "@/lib/interview/policy";
import { createDefaultPreflightSteps } from "@/lib/interview/preflight";

type RawSessionEvent = Partial<Omit<SessionEvent, "type">> & {
  type?: string;
};

type RawTranscriptSegment = Partial<Omit<TranscriptSegment, "speaker" | "status">> & {
  speaker?: string;
  status?: string;
};

type RawRecordingArtifact = Partial<RecordingArtifact> & {
  artifactType?: string;
  status?: string;
};

type PublicSessionDetail = Partial<
  Pick<
    InterviewSessionSnapshot,
    | "inviteId"
    | "sessionId"
    | "candidateName"
    | "templateName"
    | "roomName"
    | "accessState"
    | "accessMessage"
    | "policy"
    | "recordings"
  >
> & {
  state?: string;
  events?: RawSessionEvent[];
  transcript?: RawTranscriptSegment[];
};

const SESSION_STATE_SET = new Set<InterviewSessionState>([
  "created",
  "ready",
  "connecting",
  "live",
  "reconnecting",
  "interrupted",
  "processing",
  "completed",
  "failed",
]);

const SESSION_EVENT_TYPE_SET = new Set<SessionEventType>([
  "invite-opened",
  "preflight-started",
  "preflight-completed",
  "room-token-requested",
  "participant-connecting",
  "participant-joined",
  "participant-left",
  "agent-speaking",
  "candidate-speaking",
  "reconnect-started",
  "reconnect-succeeded",
  "reconnect-failed",
  "transcript-partial",
  "transcript-final",
  "candidate-screen-share-started",
  "candidate-screen-share-stopped",
  "teaching-simulation-started",
  "teaching-simulation-completed",
  "processing-started",
  "processing-completed",
  "session-failed",
]);

const TRANSCRIPT_SPEAKER_SET = new Set<TranscriptSegmentSpeaker>([
  "agent",
  "candidate",
  "system",
]);

const TRANSCRIPT_STATUS_SET = new Set<TranscriptSegmentStatus>(["partial", "final"]);

const RECORDING_ARTIFACT_TYPE_SET = new Set<RecordingArtifact["artifactType"]>([
  "audio",
  "video",
  "composite",
  "segments",
]);

const RECORDING_STATUS_SET = new Set<RecordingArtifact["status"]>([
  "starting",
  "active",
  "complete",
  "failed",
]);

function normalizeState(state: string | undefined): InterviewSessionState {
  if (state && SESSION_STATE_SET.has(state as InterviewSessionState)) {
    return state as InterviewSessionState;
  }

  return "ready";
}

function normalizeEvent(event: RawSessionEvent): SessionEvent {
  return {
    type: SESSION_EVENT_TYPE_SET.has(event.type as SessionEventType)
      ? (event.type as SessionEventType)
      : "invite-opened",
    detail: event.detail ?? "Session event captured.",
    createdAt: event.createdAt ?? new Date().toISOString(),
  };
}

function normalizeTranscriptSegment(
  segment: RawTranscriptSegment,
  index: number,
): TranscriptSegment {
  return {
    id: segment.id ?? `segment-${index}`,
    speaker: TRANSCRIPT_SPEAKER_SET.has(segment.speaker as TranscriptSegmentSpeaker)
      ? (segment.speaker as TranscriptSegmentSpeaker)
      : "system",
    text: segment.text ?? "",
    status: TRANSCRIPT_STATUS_SET.has(segment.status as TranscriptSegmentStatus)
      ? (segment.status as TranscriptSegmentStatus)
      : "final",
    startedAt: segment.startedAt ?? new Date().toISOString(),
    endedAt: segment.endedAt,
  };
}

function normalizeRecordingArtifact(
  artifact: RawRecordingArtifact,
  index: number,
): RecordingArtifact {
  return {
    id: artifact.id ?? `recording-${index}`,
    provider: "livekit",
    egressId: artifact.egressId ?? `egress-${index}`,
    artifactKey: artifact.artifactKey ?? `artifact-${index}`,
    roomName: artifact.roomName ?? "",
    artifactType: RECORDING_ARTIFACT_TYPE_SET.has(
      artifact.artifactType as RecordingArtifact["artifactType"],
    )
      ? (artifact.artifactType as RecordingArtifact["artifactType"])
      : "composite",
    status: RECORDING_STATUS_SET.has(artifact.status as RecordingArtifact["status"])
      ? (artifact.status as RecordingArtifact["status"])
      : "starting",
    filename: artifact.filename,
    location: artifact.location,
    manifestLocation: artifact.manifestLocation,
    startedAt: artifact.startedAt,
    endedAt: artifact.endedAt,
    durationMs: artifact.durationMs,
    sizeBytes: artifact.sizeBytes,
    error: artifact.error,
  };
}

export function createInitialInterviewSnapshot(
  inviteId: string,
  publicSession?: PublicSessionDetail | null,
  fallback?: {
    accessState?: InviteAccessState;
    accessMessage?: string;
    policy?: Partial<InterviewPolicy>;
  },
): InterviewSessionSnapshot {
  const events: SessionEvent[] = publicSession?.events?.length
    ? publicSession.events.map(normalizeEvent)
    : [
        {
          type: "invite-opened",
          detail: "Candidate opened the interview invite.",
          createdAt: new Date().toISOString(),
        },
      ];

  return {
    inviteId,
    sessionId: publicSession?.sessionId,
    candidateName: publicSession?.candidateName,
    templateName: publicSession?.templateName ?? "AI Tutor Screener",
    state: normalizeState(publicSession?.state),
    accessState: publicSession?.accessState ?? fallback?.accessState ?? "available",
    accessMessage: publicSession?.accessMessage ?? fallback?.accessMessage,
    policy: {
      ...DEFAULT_INTERVIEW_POLICY,
      ...fallback?.policy,
      ...publicSession?.policy,
    },
    roomName: publicSession?.roomName,
    events,
    preflight: createDefaultPreflightSteps(),
    transcript: publicSession?.transcript?.map(normalizeTranscriptSegment) ?? [],
    recordings: publicSession?.recordings?.map(normalizeRecordingArtifact) ?? [],
  };
}

export function mergeInterviewSnapshot(
  base: InterviewSessionSnapshot,
  publicSession?: PublicSessionDetail | null,
): InterviewSessionSnapshot {
  if (!publicSession) {
    return base;
  }

  return {
    ...base,
    sessionId: publicSession.sessionId ?? base.sessionId,
    candidateName: publicSession.candidateName ?? base.candidateName,
    templateName: publicSession.templateName ?? base.templateName,
    state: normalizeState(publicSession.state),
    accessState: publicSession.accessState ?? base.accessState,
    accessMessage: publicSession.accessMessage ?? base.accessMessage,
    policy: {
      ...DEFAULT_INTERVIEW_POLICY,
      ...base.policy,
      ...publicSession.policy,
    },
    roomName: publicSession.roomName ?? base.roomName,
    events: publicSession.events?.length
      ? publicSession.events.map(normalizeEvent)
      : base.events,
    preflight: normalizePreflight(base.preflight),
    transcript: publicSession.transcript?.length
      ? publicSession.transcript.map(normalizeTranscriptSegment)
      : base.transcript,
    recordings: publicSession.recordings?.length
      ? publicSession.recordings.map(normalizeRecordingArtifact)
      : base.recordings,
  };
}

function normalizePreflight(preflight: PreflightStep[]): PreflightStep[] {
  if (preflight.length === PRE_FLIGHT_STEPS.length) {
    return preflight;
  }

  return createDefaultPreflightSteps();
}
