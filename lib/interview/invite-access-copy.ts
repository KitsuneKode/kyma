import { type InviteAccessState } from '@/lib/interview/types'

export function getInviteAccessCopy(accessState: InviteAccessState) {
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

export const UNAVAILABLE_INVITE_FALLBACK_MESSAGE =
  'This interview link is invalid, revoked, or not yet ready. Please confirm the link with the recruiter.'
