'use client'

import { type InviteAccessState } from '@/lib/interview/types'

type InviteAccessScreenProps = {
  accessMessage?: string
  accessState: InviteAccessState
  inviteId: string
}

function getInviteAccessCopy(accessState: InviteAccessState) {
  switch (accessState) {
    case 'expired':
      return {
        eyebrow: 'Link expired',
        title: 'This interview link has expired.',
        body: 'Ask the recruiter for a fresh link. We keep invites time-bounded so the screening stays controlled and single-use.',
      }
    case 'consumed':
      return {
        eyebrow: 'Already submitted',
        title: 'This interview has already been used.',
        body: 'The invite is now locked so the same candidate cannot submit multiple attempts through the same screening link.',
      }
    case 'unavailable':
      return {
        eyebrow: 'Link unavailable',
        title: 'This interview link is not available.',
        body: 'The invite may be invalid, revoked, or not yet ready. Please confirm the link with the recruiter.',
      }
    default:
      return {
        eyebrow: 'Interview access',
        title: 'This interview is not available right now.',
        body: 'Please confirm the invite details with the recruiter.',
      }
  }
}

export function InviteAccessScreen({
  accessMessage,
  accessState,
  inviteId,
}: InviteAccessScreenProps) {
  const copy = getInviteAccessCopy(accessState)

  return (
    <section className="rounded-2xl border border-border/80 bg-card/90 p-8 shadow-sm">
      <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        {copy.eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        {copy.title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        {accessMessage ?? copy.body}
      </p>

      <div className="mt-6 rounded-2xl border border-border/80 bg-background/70 p-4 text-sm shadow-sm">
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Invite
        </p>
        <p className="mt-2 font-medium">{inviteId}</p>
      </div>
    </section>
  )
}
