export function hasClerkServerCredentials() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_FRONTEND_API_URL &&
      process.env.CLERK_SECRET_KEY &&
      process.env.CLERK_SECRET_KEY.trim() &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.trim() &&
      process.env.CLERK_FRONTEND_API_URL.trim(),
  );
}
