import { env } from "@/lib/env";

export function getClerkIssuerDomain() {
  return env.CLERK_FRONTEND_API_URL || env.CLERK_JWT_ISSUER_DOMAIN || null;
}

export function hasClerkServerCredentials() {
  return Boolean(
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    env.CLERK_SECRET_KEY &&
    getClerkIssuerDomain(),
  );
}
