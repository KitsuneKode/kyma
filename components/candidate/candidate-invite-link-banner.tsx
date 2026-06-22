'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'

import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WorkspaceSurface } from '@/components/workspace/surface'

type CandidateInviteLinkBannerProps = {
  initialError?: string | null
}

export function CandidateInviteLinkBanner({
  initialError,
}: CandidateInviteLinkBannerProps) {
  const claimInvite = useMutation(api.interviews.claimCandidateInviteByToken)
  const [inviteToken, setInviteToken] = useState('')
  const [status, setStatus] = useState<string | null>(initialError ?? null)
  const [busy, setBusy] = useState(false)

  async function handleClaim() {
    const token = inviteToken.trim()
    if (!token) {
      setStatus('Enter the invite token from your screening link.')
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const result = await claimInvite({ inviteToken: token })
      if (result.linked) {
        setStatus('Interview linked to your account. Refreshing…')
        window.location.reload()
        return
      }
      setStatus('No matching invite found for that token and your account.')
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Unable to link this invite.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <WorkspaceSurface className="mb-6 space-y-3 p-4">
      <div>
        <p className="text-sm font-medium">Link a screening invite</p>
        <p className="mt-1 text-sm text-muted-foreground">
          If your interview does not appear, paste the token from your invite
          URL (the part after{' '}
          <code className="rounded bg-muted px-1">/interviews/</code>
          ). Your Clerk email must match the invite email.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={inviteToken}
          onChange={(event) => setInviteToken(event.target.value)}
          placeholder="invite-token"
          className="font-mono text-sm"
        />
        <Button
          type="button"
          disabled={busy}
          onClick={() => void handleClaim()}
        >
          {busy ? 'Linking…' : 'Link invite'}
        </Button>
      </div>
      {status ? (
        <p className="text-sm text-muted-foreground" role="status">
          {status}
        </p>
      ) : null}
    </WorkspaceSurface>
  )
}
