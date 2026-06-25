'use client'

import { useAuth } from '@clerk/nextjs'
import { useState, useTransition } from 'react'

import { inviteTeammateByEmail } from '@/lib/auth/team-invite-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WorkspaceSurface } from '@/components/workspace/surface'

export function TeamInviteForm() {
  const { orgRole } = useAuth()
  const isOrgAdmin = orgRole === 'org:admin'
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isOrgAdmin) {
    return null
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const result = await inviteTeammateByEmail(email)
      if (result.ok) {
        setEmail('')
        setFeedback({
          tone: 'success',
          message:
            'Invitation sent. They can accept via email and land in this workspace.',
        })
        return
      }
      setFeedback({ tone: 'error', message: result.error })
    })
  }

  return (
    <WorkspaceSurface id="team" className="scroll-mt-24 p-6">
      <h2 className="text-lg font-semibold">Team invites</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Invite a recruiter teammate by email. They will join this organization
        with member access after accepting the Clerk invitation.
      </p>
      <form
        onSubmit={handleSubmit}
        className="mt-4 flex flex-col gap-3 sm:flex-row"
      >
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="teammate@company.com"
          autoComplete="email"
          className="sm:max-w-sm"
          disabled={isPending}
        />
        <Button type="submit" disabled={isPending || !email.trim()}>
          {isPending ? 'Sending…' : 'Invite teammate'}
        </Button>
      </form>
      {feedback ? (
        <p
          className={
            feedback.tone === 'success'
              ? 'mt-3 text-sm text-emerald-600 dark:text-emerald-400'
              : 'mt-3 text-sm text-destructive'
          }
        >
          {feedback.message}
        </p>
      ) : null}
    </WorkspaceSurface>
  )
}
