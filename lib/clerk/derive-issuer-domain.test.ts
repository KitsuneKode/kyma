import { describe, expect, it } from 'vitest'

import { deriveClerkIssuerDomainFromPublishableKey } from '@/lib/clerk/derive-issuer-domain'

describe('deriveClerkIssuerDomainFromPublishableKey', () => {
  it('returns null for empty input', () => {
    expect(deriveClerkIssuerDomainFromPublishableKey('')).toBeNull()
    expect(deriveClerkIssuerDomainFromPublishableKey(undefined)).toBeNull()
  })

  it('derives issuer domain from a Clerk test publishable key', () => {
    const host = 'clerk.example.accounts.dev'
    const encoded = Buffer.from(`${host}$`).toString('base64')
    const publishableKey = `pk_test_${encoded}`

    expect(deriveClerkIssuerDomainFromPublishableKey(publishableKey)).toBe(
      `https://${host}`
    )
  })
})
