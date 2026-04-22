import type { AuthConfig } from 'convex/server'
import { convexEnv } from '../lib/env/convex'
const clerkIssuerDomain =
  convexEnv.CLERK_FRONTEND_API_URL?.trim() ||
  convexEnv.CLERK_JWT_ISSUER_DOMAIN?.trim()
const clerkPublishableKey = convexEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
const clerkSecretKey = convexEnv.CLERK_SECRET_KEY?.trim()

const authConfig = {
  providers:
    clerkIssuerDomain && clerkPublishableKey && clerkSecretKey
      ? [
          {
            domain: clerkIssuerDomain,
            applicationID: 'convex',
          },
        ]
      : [],
} satisfies AuthConfig

export default authConfig
