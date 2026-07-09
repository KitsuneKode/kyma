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

type SentryLike = {
  captureException: (
    error: unknown,
    hint?: {
      tags?: Record<string, string>
      extra?: Record<string, unknown>
    }
  ) => void
}

/**
 * Optional dynamic load of `@sentry/nextjs`.
 * Returns null when the package is not installed (expected for MVP).
 *
 * TODO(sentry):
 * 1. `bun add @sentry/nextjs`
 * 2. Initialize in `instrumentation.ts` with `SENTRY_DSN`
 * 3. Keep this reporter as the single capture entrypoint for API routes
 */
async function loadSentry(): Promise<SentryLike | null> {
  try {
    // Runtime-only resolve so builds succeed when `@sentry/nextjs` is absent.
    const dynamicImport = new Function(
      'moduleId',
      'return import(moduleId)'
    ) as (
      moduleId: string
    ) => Promise<Partial<SentryLike> & { default?: SentryLike }>
    const mod = await dynamicImport('@sentry/nextjs')

    if (typeof mod.captureException === 'function') {
      return mod as SentryLike
    }
    if (mod.default && typeof mod.default.captureException === 'function') {
      return mod.default
    }
    return null
  } catch {
    return null
  }
}

async function tryReportToSentry(
  error: Error,
  context?: ErrorReportContext
): Promise<void> {
  const sentry = await loadSentry()
  if (!sentry) {
    return
  }

  sentry.captureException(error, {
    tags: {
      ...(context?.route ? { route: context.route } : {}),
      ...context?.tags,
    },
    extra: {
      requestId: context?.requestId,
      ...context?.extra,
    },
  })
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
    await tryReportToSentry(normalizeError(error), context)
  } catch (reportingFailure) {
    console.error('[ops:error] reporter failed', reportingFailure)
  }
}
