import 'server-only'

import { connection } from 'next/server'
import { fetchMutation, fetchQuery } from 'convex/nextjs'
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from 'convex/server'

import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'
import { runConvexFetch, type FetchResult } from '@/lib/convex/server-fetch'

export { runConvexFetch, type FetchResult } from '@/lib/convex/server-fetch'

export function hasConvexDeployment() {
  return Boolean(clientEnv.NEXT_PUBLIC_CONVEX_URL?.trim())
}

async function ensureDynamicBoundary() {
  await connection()
}

type ServerConvexOptions = {
  /** When omitted, resolves the Clerk Convex JWT for the current request. */
  token?: string | null
  /** Skip auth token resolution (public Convex queries). */
  public?: boolean
}

async function resolveConvexToken(options?: ServerConvexOptions) {
  if (options?.public) {
    return undefined
  }

  if (options?.token !== undefined) {
    return options.token ?? undefined
  }

  return (await getServerConvexAuthToken()) ?? undefined
}

export async function serverConvexQuery<
  Query extends FunctionReference<'query'>,
>(
  query: Query,
  args: FunctionArgs<Query>,
  options?: ServerConvexOptions
): Promise<FetchResult<FunctionReturnType<Query>>> {
  await ensureDynamicBoundary()

  if (!hasConvexDeployment()) {
    return {
      ok: false,
      kind: 'unknown',
      message: 'Convex deployment URL is not configured.',
    }
  }

  const token = await resolveConvexToken(options)

  return runConvexFetch(() =>
    fetchQuery(query, args, { token: token ?? undefined })
  )
}

export async function serverConvexMutation<
  Mutation extends FunctionReference<'mutation'>,
>(
  mutation: Mutation,
  args: FunctionArgs<Mutation>,
  options?: ServerConvexOptions
): Promise<FetchResult<FunctionReturnType<Mutation>>> {
  await ensureDynamicBoundary()

  if (!hasConvexDeployment()) {
    return {
      ok: false,
      kind: 'unknown',
      message: 'Convex deployment URL is not configured.',
    }
  }

  const token = await resolveConvexToken(options)

  return runConvexFetch(() =>
    fetchMutation(mutation, args, { token: token ?? undefined })
  )
}

/**
 * Authenticated server query with a typed fallback when Convex is unavailable
 * or the caller has no session token yet.
 */
export async function serverConvexQueryWithFallback<
  Query extends FunctionReference<'query'>,
  Fallback,
>(
  query: Query,
  args: FunctionArgs<Query>,
  fallback: Fallback,
  options?: Omit<ServerConvexOptions, 'public'> & {
    requireToken?: boolean
  }
): Promise<FetchResult<FunctionReturnType<Query> | Fallback>> {
  await ensureDynamicBoundary()

  if (!hasConvexDeployment()) {
    return { ok: true, data: fallback }
  }

  if (options?.requireToken !== false) {
    const token =
      options?.token !== undefined
        ? options.token
        : await getServerConvexAuthToken()

    if (!token) {
      return { ok: true, data: fallback }
    }
  }

  return serverConvexQuery(query, args, options)
}
