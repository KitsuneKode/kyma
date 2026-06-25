'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { useEffect, useRef } from 'react'

import { api } from '@/convex/_generated/api'
import { CandidateInviteLinkError } from '@/components/candidate/candidate-invite-link-error'

const LINK_SESSION_KEY = 'kyma-candidate-invite-email-linked'

export function CandidateInviteEmailLinker() {
  const linkInvites = useMutation(
    api.interviews.candidatePortal.linkCandidateInviteByEmail
  )
  const startedRef = useRef(false)
  const [linkError, setLinkError] = useState<string | null>(null)

  useEffect(() => {
    if (startedRef.current) {
      return
    }
    startedRef.current = true

    if (
      typeof window !== 'undefined' &&
      sessionStorage.getItem(LINK_SESSION_KEY)
    ) {
      return
    }

    void linkInvites({})
      .then(() => {
        sessionStorage.setItem(LINK_SESSION_KEY, '1')
      })
      .catch((error) => {
        setLinkError(
          error instanceof Error
            ? error.message
            : 'Unable to link screening invites to your account.'
        )
      })
  }, [linkInvites])

  if (!linkError) {
    return null
  }

  return <CandidateInviteLinkError message={linkError} />
}
