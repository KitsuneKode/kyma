import type { AuthConfig } from 'convex/server'
import { runtimeEnv } from '../lib/env/runtime'
const clerkIssuerDomain =
  runtimeEnv.CLERK_FRONTEND_API_URL?.trim() ||
  runtimeEnv.CLERK_JWT_ISSUER_DOMAIN?.trim()
const clerkPublishableKey = runtimeEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
const clerkSecretKey = runtimeEnv.CLERK_SECRET_KEY?.trim()

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
