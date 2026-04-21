type DiagnosticLevel = "debug" | "info" | "warn" | "error";

type DiagnosticPayload = {
  level?: DiagnosticLevel;
  event: string;
  detail?: string;
  requestId?: string;
  sessionId?: string;
  inviteToken?: string;
  roomName?: string;
  actor?: "candidate" | "agent" | "server" | "convex" | "system";
  participantIdentity?: string;
  stateFrom?: string;
  stateTo?: string;
  attempt?: number;
  meta?: Record<string, unknown>;
  error?: unknown;
};

type DiagnosticLogger = {
  debug: (payload: Omit<DiagnosticPayload, "level">) => void;
  info: (payload: Omit<DiagnosticPayload, "level">) => void;
  warn: (payload: Omit<DiagnosticPayload, "level">) => void;
  error: (payload: Omit<DiagnosticPayload, "level">) => void;
};

function shouldLogDiagnostics() {
  return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_DEV_TRACE === "1";
}

function normalizeError(error: unknown) {
  if (!error) {
    return undefined;
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}

function writeDiagnostic(scope: string, payload: DiagnosticPayload) {
  if (!shouldLogDiagnostics()) {
    return;
  }

  const entry = {
    ts: new Date().toISOString(),
    scope,
    level: payload.level ?? "info",
    event: payload.event,
    detail: payload.detail,
    requestId: payload.requestId,
    sessionId: payload.sessionId,
    inviteToken: payload.inviteToken,
    roomName: payload.roomName,
    actor: payload.actor,
    participantIdentity: payload.participantIdentity,
    stateFrom: payload.stateFrom,
    stateTo: payload.stateTo,
    attempt: payload.attempt,
    meta: payload.meta,
    error: normalizeError(payload.error),
  };

  const sink =
    entry.level === "error"
      ? console.error
      : entry.level === "warn"
        ? console.warn
        : entry.level === "debug"
          ? console.debug
          : console.info;

  sink(`[kyma:${scope}] ${entry.event}`, entry);
}

export function createDiagnosticLogger(
  scope: string,
  basePayload: Omit<DiagnosticPayload, "event" | "level"> = {},
): DiagnosticLogger {
  function log(level: DiagnosticLevel, payload: Omit<DiagnosticPayload, "level">) {
    writeDiagnostic(scope, {
      ...basePayload,
      ...payload,
      level,
    });
  }

  return {
    debug: (payload) => log("debug", payload),
    info: (payload) => log("info", payload),
    warn: (payload) => log("warn", payload),
    error: (payload) => log("error", payload),
  };
}

export function createRequestId(prefix = "req") {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `${prefix}_${id}`;
}
