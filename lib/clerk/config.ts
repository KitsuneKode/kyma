export function getClerkIssuerDomain() {
  const issuer =
    process.env.CLERK_FRONTEND_API_URL?.trim() ||
    process.env.CLERK_JWT_ISSUER_DOMAIN?.trim() ||
    ""

  return issuer || null
}

export function hasClerkServerCredentials() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
    process.env.CLERK_SECRET_KEY?.trim() &&
    getClerkIssuerDomain()
  )
}
