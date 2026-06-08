'use client'

import { useConvexAuth, useQuery } from 'convex/react'
import type { FunctionReference } from 'convex/server'

type PublicQuery = FunctionReference<'query', 'public'>

export function useAuthenticatedQuery<Query extends PublicQuery>(
  query: Query,
  args: Query['_args']
): {
  data: Query['_returnType'] | undefined
  authLoading: boolean
  isAuthenticated: boolean
} {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const skipped = authLoading || !isAuthenticated
  const data = useQuery(
    query,
    ...(skipped ? (['skip'] as const) : ([args] as [Query['_args']]))
  )

  return {
    data,
    authLoading,
    isAuthenticated,
  }
}
