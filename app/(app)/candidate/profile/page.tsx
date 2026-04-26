import { auth } from '@clerk/nextjs/server'

import { CandidateProfilePanel } from '@/components/candidate/profile-panel'

export default async function CandidateProfilePage() {
  const { sessionClaims } = await auth()
  const claims = sessionClaims as
    | { email?: string | null; name?: string | null }
    | undefined

  return (
    <CandidateProfilePanel
      identity={{
        name: claims?.name ?? 'Candidate',
        email: claims?.email ?? 'No email available',
      }}
    />
  )
}
