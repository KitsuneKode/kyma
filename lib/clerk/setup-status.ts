import 'server-only'

import { clientEnv } from '@/lib/env/client'
import { serverEnv } from '@/lib/env/server'

import { deriveClerkIssuerDomainFromPublishableKey } from '@/lib/clerk/derive-issuer-domain'

export type ClerkSetupMissingKey =
  | 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
  | 'CLERK_SECRET_KEY'
  | 'CLERK_FRONTEND_API_URL'
  | 'CLERK_JWT_ISSUER_DOMAIN'
  | 'NEXT_PUBLIC_CONVEX_URL'
  | 'KYMA_PROCESSING_WRITE_KEY'

export type ClerkSetupStatus = {
  ready: boolean
  missing: ClerkSetupMissingKey[]
  derivedIssuerDomain: string | null
  convexUrlSet: boolean
}

function isSet(value: string | undefined) {
  return Boolean(value?.trim())
}

export function getClerkSetupStatus(): ClerkSetupStatus {
  const publishableKey = clientEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const secretKey = serverEnv.CLERK_SECRET_KEY
  const issuerDomain =
    serverEnv.CLERK_FRONTEND_API_URL?.trim() ||
    serverEnv.CLERK_JWT_ISSUER_DOMAIN?.trim() ||
    null
  const derivedIssuerDomain =
    deriveClerkIssuerDomainFromPublishableKey(publishableKey)

  const missing: ClerkSetupMissingKey[] = []

  if (!isSet(publishableKey)) {
    missing.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY')
  }
  if (!isSet(secretKey)) {
    missing.push('CLERK_SECRET_KEY')
  }
  if (!issuerDomain && !derivedIssuerDomain) {
    missing.push('CLERK_FRONTEND_API_URL')
    missing.push('CLERK_JWT_ISSUER_DOMAIN')
  }
  if (!isSet(clientEnv.NEXT_PUBLIC_CONVEX_URL)) {
    missing.push('NEXT_PUBLIC_CONVEX_URL')
  }
  if (!isSet(serverEnv.KYMA_PROCESSING_WRITE_KEY)) {
    missing.push('KYMA_PROCESSING_WRITE_KEY')
  }

  const ready =
    isSet(publishableKey) &&
    isSet(secretKey) &&
    Boolean(issuerDomain || derivedIssuerDomain) &&
    isSet(clientEnv.NEXT_PUBLIC_CONVEX_URL)

  return {
    ready,
    missing,
    derivedIssuerDomain,
    convexUrlSet: isSet(clientEnv.NEXT_PUBLIC_CONVEX_URL),
  }
}
