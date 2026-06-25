'use client'

import { useMutation } from 'convex/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { api } from '@/convex/_generated/api'
import { CandidateInviteLinkError } from '@/components/candidate/candidate-invite-link-error'

const LINK_SESSION_KEY = 'kyma-candidate-invite-email-linked'

export function CandidateInviteEmailLinker() {
  const linkInvites = useMutation(
    api.interviews.candidatePortal.linkCandidateInviteByEmail
  )
  const inFlightRef = useRef(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  const attemptLink = useCallback(async () => {
    if (typeof window === 'undefined') {
      return
    }

    if (sessionStorage.getItem(LINK_SESSION_KEY)) {
      return
    }

    if (inFlightRef.current) {
      return
    }

    inFlightRef.current = true
    try {
      const result = await linkInvites({})
      if (result && result.linkedInvites > 0) {
        sessionStorage.setItem(LINK_SESSION_KEY, '1')
      }
      setLinkError(null)
    } catch (error) {
      setLinkError(
        error instanceof Error
          ? error.message
          : 'Unable to link screening invites to your account.'
      )
    } finally {
      inFlightRef.current = false
    }
  }, [linkInvites])

  useEffect(() => {
    void attemptLink()

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void attemptLink()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [attemptLink])

  if (!linkError) {
    return null
  }

  return <CandidateInviteLinkError message={linkError} />
}
