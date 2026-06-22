'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'

import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WorkspaceSurface } from '@/components/workspace/surface'

export function CandidateInviteLinkBanner() {
  const claimInvite = useMutation(
    api.interviews.candidatePortal.claimCandidateInviteByToken
  )
  const [open, setOpen] = useState(false)
  const [inviteToken, setInviteToken] = useState('')
  const [status, setStatus] = useState<string | null>(null)
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
    <WorkspaceSurface className="mb-6 p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-medium">Missing an interview?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Recovery only — open your invite link while signed in first.
          </p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open ? (
        <div className="mt-4 space-y-3 border-t border-border/40 pt-4">
          <p className="text-sm text-muted-foreground">
            If a screening still does not appear, paste the token from your
            invite URL (the part after{' '}
            <code className="rounded bg-muted px-1">/i/</code> or{' '}
            <code className="rounded bg-muted px-1">/interviews/</code>
            ). Your sign-in email must match the invite email.
          </p>
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
              variant="outline"
              onClick={() => void handleClaim()}
            >
              {busy ? 'Linking…' : 'Link invite manually'}
            </Button>
          </div>
          {status ? (
            <p className="text-sm text-muted-foreground" role="status">
              {status}
            </p>
          ) : null}
        </div>
      ) : null}
    </WorkspaceSurface>
  )
}
