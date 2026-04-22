import { clientEnv } from '@/lib/env/client'
import { serverEnv } from '@/lib/env/server'

export function getClerkIssuerDomain() {
  return (
    serverEnv.CLERK_FRONTEND_API_URL ||
    serverEnv.CLERK_JWT_ISSUER_DOMAIN ||
    null
  )
}

export function hasClerkServerCredentials() {
  return Boolean(
    clientEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    serverEnv.CLERK_SECRET_KEY &&
    getClerkIssuerDomain()
  )
}
