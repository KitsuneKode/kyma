'use client'

import { useAuth } from '@clerk/nextjs'
import { useConvexAuth, useMutation } from 'convex/react'
import { useEffect, useRef } from 'react'

import { api } from '@/convex/_generated/api'

/** Syncs the signed-in Clerk user to Convex `users` once per session (webhook fallback). */
export function EnsureConvexUser() {
  const { isSignedIn } = useAuth()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser)
  const syncedRef = useRef(false)

  useEffect(() => {
    if (!isSignedIn || isLoading || !isAuthenticated || syncedRef.current) {
      return
    }

    syncedRef.current = true
    void ensureCurrentUser({}).catch(() => {
      syncedRef.current = false
    })
  }, [ensureCurrentUser, isAuthenticated, isLoading, isSignedIn])

  return null
}
