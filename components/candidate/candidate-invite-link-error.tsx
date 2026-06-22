import { WorkspaceSurface } from '@/components/workspace/surface'

type CandidateInviteLinkErrorProps = {
  message: string
}

export function CandidateInviteLinkError({
  message,
}: CandidateInviteLinkErrorProps) {
  return (
    <WorkspaceSurface className="mb-6 border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm font-medium text-destructive">
        Could not link screening invites
      </p>
      <p className="mt-1 text-sm text-destructive/90" role="alert">
        {message}
      </p>
    </WorkspaceSurface>
  )
}
