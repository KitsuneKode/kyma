/**
 * Derive Clerk JWT issuer domain from a publishable key.
 * Clerk pk_(test|live)_ keys base64-encode "<frontend-api-host>$".
 */
export function deriveClerkIssuerDomainFromPublishableKey(
  publishableKey: string | undefined | null
): string | null {
  const pk = publishableKey?.trim()
  if (!pk) {
    return null
  }

  const encoded = pk.replace(/^pk_(test|live)_/, '')
  if (!encoded) {
    return null
  }

  try {
    const host = Buffer.from(encoded, 'base64')
      .toString('utf8')
      .replace(/\$$/, '')
    if (!host) {
      return null
    }
    return `https://${host}`
  } catch {
    return null
  }
}
