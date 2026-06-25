import { Logo } from '@/components/marketing/logo'
import { getInviteAccessCopy } from '@/lib/interview/invite-access-copy'
import { type InviteAccessState } from '@/lib/interview/types'

type InviteAccessScreenProps = {
  accessMessage?: string
  accessState: InviteAccessState
  templateName?: string
  orgName?: string
}

export function InviteAccessScreen({
  accessMessage,
  accessState,
  templateName,
  orgName,
}: InviteAccessScreenProps) {
  const copy = getInviteAccessCopy(accessState)
  const interviewLabel = templateName?.trim()
    ? templateName.replace(/\s+default$/i, '')
    : 'Interview session'
  const orgLabel = orgName?.trim() || 'Hiring team'

  return (
    <section className="rounded-2xl border border-border/80 bg-card/90 p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Logo className="h-7 w-auto text-primary" />
        <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          {orgLabel}
        </p>
      </div>

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
          Screening
        </p>
        <p className="mt-2 font-medium">{interviewLabel}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Contact {orgLabel.toLowerCase()} if you need a refreshed invite.
        </p>
      </div>
    </section>
  )
}
