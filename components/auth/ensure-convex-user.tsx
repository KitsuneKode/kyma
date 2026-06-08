'use client'

import { useAuth } from '@clerk/nextjs'
import { useConvexAuth, useMutation } from 'convex/react'
import { useEffect, useRef } from 'react'

import { api } from '@/convex/_generated/api'

/** Syncs Clerk user + active org into Convex after auth is ready (webhook fallback). */
export function EnsureConvexUser() {
  const { isSignedIn } = useAuth()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const ensureCurrentWorkspace = useMutation(
    api.workspace.ensureCurrentWorkspace
  )
  const syncedRef = useRef(false)

  useEffect(() => {
    if (!isSignedIn || isLoading || !isAuthenticated || syncedRef.current) {
      return
    }

    syncedRef.current = true
    void ensureCurrentWorkspace({}).catch(() => {
      syncedRef.current = false
    })
  }, [ensureCurrentWorkspace, isAuthenticated, isLoading, isSignedIn])

  return null
}
