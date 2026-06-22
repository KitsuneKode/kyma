import { getInviteAccessCopy } from '@/lib/interview/invite-access-copy'
import { type InviteAccessState } from '@/lib/interview/types'

type InviteAccessScreenProps = {
  accessMessage?: string
  accessState: InviteAccessState
  inviteId: string
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
