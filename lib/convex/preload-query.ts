import 'server-only'

import { connection } from 'next/server'
import { preloadQuery } from 'convex/nextjs'
import type { FunctionArgs, FunctionReference } from 'convex/server'

import { getServerConvexAuthToken } from '@/lib/clerk/server-token'
import { clientEnv } from '@/lib/env/client'

export async function serverPreloadConvexQuery<
  Query extends FunctionReference<'query'>,
>(
  query: Query,
  args: FunctionArgs<Query>
): Promise<Awaited<ReturnType<typeof preloadQuery<Query>>> | null> {
  await connection()

  if (!clientEnv.NEXT_PUBLIC_CONVEX_URL?.trim()) {
    return null
  }

  const token = (await getServerConvexAuthToken()) ?? undefined

  return preloadQuery(query, args, { token })
}
