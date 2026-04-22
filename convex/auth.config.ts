import type { AuthConfig } from 'convex/server'
const clerkIssuerDomain =
  process.env.CLERK_FRONTEND_API_URL?.trim() ||
  process.env.CLERK_JWT_ISSUER_DOMAIN?.trim()
const clerkPublishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
const clerkSecretKey = process.env.CLERK_SECRET_KEY?.trim()

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
