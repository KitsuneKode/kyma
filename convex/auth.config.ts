import type { AuthConfig } from 'convex/server'

// Keep auth config env access intentionally narrow. Convex inspects this file's
// env usage directly, and importing the shared runtime env causes unrelated keys
// like NEXT_PUBLIC_CONVEX_URL to be treated as auth requirements.
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
