import 'server-only'

/**
 * Thin operational error reporting.
 *
 * Today: always logs via `console.error`.
 * Tomorrow: optional Sentry when `@sentry/nextjs` is installed and initialized.
 *
 * Do not add `@sentry/nextjs` as a hard dependency until ops enables it.
 */

export type ErrorReportContext = {
  /** Stable route or job name, e.g. `/api/interviews/bootstrap`. */
  route?: string
  requestId?: string
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}

export type ErrorReporter = {
  captureException: (
    error: unknown,
    context?: ErrorReportContext
  ) => Promise<void>
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }
  return new Error(typeof error === 'string' ? error : String(error))
}

const consoleReporter: ErrorReporter = {
  async captureException(error, context) {
    const normalized = normalizeError(error)
    console.error('[ops:error]', {
      message: normalized.message,
      name: normalized.name,
      stack: normalized.stack,
      route: context?.route,
      requestId: context?.requestId,
      tags: context?.tags,
      extra: context?.extra,
    })
  },
}

/**
 * Capture an unexpected error for ops. Safe to call from route catch blocks;
 * never throws.
 */
export async function reportError(
  error: unknown,
  context?: ErrorReportContext
): Promise<void> {
  try {
    await consoleReporter.captureException(error, context)
  } catch (reportingFailure) {
    console.error('[ops:error] reporter failed', reportingFailure)
  }
}
