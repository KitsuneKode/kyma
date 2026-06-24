import { api } from '@/convex/_generated/api'
import { CandidateProfilePanel } from '@/components/candidate/profile-panel'
import { serverConvexQueryWithFallback } from '@/lib/convex/server-query'
import { auth } from '@clerk/nextjs/server'

export default async function CandidateProfilePage() {
  const [{ sessionClaims }, preferencesResult] = await Promise.all([
    auth(),
    serverConvexQueryWithFallback(
      api.profile.getCandidatePreferences,
      {},
      null
    ),
  ])
  const claims = sessionClaims as
    | { email?: string | null; name?: string | null }
    | undefined

  return (
    <CandidateProfilePanel
      identity={{
        name: claims?.name ?? 'Candidate',
        email: claims?.email ?? 'No email available',
      }}
      initialPreferences={
        preferencesResult.ok && preferencesResult.data
          ? preferencesResult.data
          : undefined
      }
    />
  )
}
