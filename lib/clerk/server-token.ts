import { auth } from '@clerk/nextjs/server'

import { hasClerkServerCredentials } from '@/lib/clerk/config'

export async function getServerConvexAuthToken() {
  if (!hasClerkServerCredentials()) {
    return undefined
  }

  const authState = await auth()

  if (!authState.userId) {
    return null
  }

  if (authState.sessionClaims?.aud === 'convex') {
    return await authState.getToken()
  }

  return (
    (await authState.getToken({ template: 'convex' }).catch(() => null)) ??
    (await authState.getToken().catch(() => null))
  )
}
