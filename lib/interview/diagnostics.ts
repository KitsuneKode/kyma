import { getRuntimeModeFromNodeEnv } from '@/lib/env/node-env'

type DiagnosticLevel = 'debug' | 'info' | 'warn' | 'error'

type DiagnosticPayload = {
  level?: DiagnosticLevel
  event: string
  detail?: string
  requestId?: string
  sessionId?: string
  inviteToken?: string
  roomName?: string
  actor?: 'candidate' | 'agent' | 'server' | 'convex' | 'system'
  participantIdentity?: string
  stateFrom?: string
  stateTo?: string
  attempt?: number
  meta?: Record<string, unknown>
  error?: unknown
}

export type DiagnosticLogger = {
  debug: (payload: Omit<DiagnosticPayload, 'level'>) => void
  info: (payload: Omit<DiagnosticPayload, 'level'>) => void
  warn: (payload: Omit<DiagnosticPayload, 'level'>) => void
  error: (payload: Omit<DiagnosticPayload, 'level'>) => void
}

/**
 * Diagnostics are for local/dev investigation only.
 * `NEXT_PUBLIC_ENABLE_DEV_TRACE=1` must never enable logging in production
 * (`NODE_ENV === 'production'` / runtime production mode).
 */
export function shouldLogDiagnostics() {
  return getRuntimeModeFromNodeEnv() !== 'production'
}

/** Redact invite tokens for logs — keep only the last 4 characters. */
export function redactInviteToken(
  token: string | undefined
): string | undefined {
  if (token === undefined) {
    return undefined
  }

  if (token.length === 0) {
    return undefined
  }

  if (token.length <= 4) {
    return '****'
  }

  return `***${token.slice(-4)}`
}

function normalizeError(error: unknown) {
  if (!error) {
    return undefined
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    message: String(error),
  }
}

function writeDiagnostic(scope: string, payload: DiagnosticPayload) {
  if (!shouldLogDiagnostics()) {
    return
  }

  const entry = {
    ts: new Date().toISOString(),
    scope,
    level: payload.level ?? 'info',
    event: payload.event,
    detail: payload.detail,
    requestId: payload.requestId,
    sessionId: payload.sessionId,
    inviteToken: redactInviteToken(payload.inviteToken),
    roomName: payload.roomName,
    actor: payload.actor,
    participantIdentity: payload.participantIdentity,
    stateFrom: payload.stateFrom,
    stateTo: payload.stateTo,
    attempt: payload.attempt,
    meta: payload.meta,
    error: normalizeError(payload.error),
  }

  const sink =
    entry.level === 'error'
      ? console.error
      : entry.level === 'warn'
        ? console.warn
        : entry.level === 'debug'
          ? console.debug
          : console.info

  sink(`[kyma:${scope}] ${entry.event}`, entry)
}

export function createDiagnosticLogger(
  scope: string,
  basePayload: Omit<DiagnosticPayload, 'event' | 'level'> = {}
): DiagnosticLogger {
  function log(
    level: DiagnosticLevel,
    payload: Omit<DiagnosticPayload, 'level'>
  ) {
    writeDiagnostic(scope, {
      ...basePayload,
      ...payload,
      level,
    })
  }

  return {
    debug: (payload) => log('debug', payload),
    info: (payload) => log('info', payload),
    warn: (payload) => log('warn', payload),
    error: (payload) => log('error', payload),
  }
}

export function createRequestId(prefix = 'req') {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)

  return `${prefix}_${id}`
}

/**
 * Convex `ConvexError`s are thrown deliberately by our own backend code with
 * candidate-facing wording ("This interview link has expired."). They are safe
 * to surface. Anything else - a runtime fault, a validator failure, a provider
 * error - is an internal detail and must not reach a public caller.
 *
 * Matched by name rather than `instanceof`: the error crosses the Convex client
 * boundary, so the prototype is not preserved.
 */
export function isClientSafeConvexError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'ConvexError' || error.constructor?.name === 'ConvexError')
  )
}

/** Strips Convex's "[Request ID: ...] Server Error / Uncaught ConvexError:" framing. */
export function extractConvexErrorMessage(error: unknown): string | null {
  if (!isClientSafeConvexError(error) || !(error instanceof Error)) {
    return null
  }
  const match = error.message.match(/Uncaught ConvexError:\s*([^\n]+)/)
  const message = (match?.[1] ?? error.message).trim()
  return message.length > 0 && message.length <= 200 ? message : null
}
