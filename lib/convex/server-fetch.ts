type FetchErrorKind = 'auth' | 'forbidden' | 'not_found' | 'unknown'

export type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: FetchErrorKind; message?: string }

function classifyConvexError(error: unknown): FetchErrorKind {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase()

  if (
    message.includes('not authenticated') ||
    message.includes('must be signed in') ||
    message.includes('unauthenticated')
  ) {
    return 'auth'
  }

  if (message.includes('not found')) {
    return 'not_found'
  }

  if (
    message.includes('not authorized') ||
    message.includes('permission') ||
    message.includes('organization')
  ) {
    return 'forbidden'
  }

  return 'unknown'
}

export async function runConvexFetch<T>(
  operation: () => Promise<T>
): Promise<FetchResult<T>> {
  try {
    const data = await operation()
    return { ok: true, data }
  } catch (error) {
    return {
      ok: false,
      kind: classifyConvexError(error),
      message: error instanceof Error ? error.message : undefined,
    }
  }
}
