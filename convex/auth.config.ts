import type { AuthConfig } from "convex/server";
const clerkIssuerDomain = process.env.CLERK_FRONTEND_API_URL;

const authConfig = {
  providers: clerkIssuerDomain
    ? [
        {
          domain: clerkIssuerDomain,
          applicationID: "convex",
        },
      ]
    : [],
} satisfies AuthConfig;

export default authConfig;
