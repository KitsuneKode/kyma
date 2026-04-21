export function hasClerkCredentials() {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY &&
      process.env.CLERK_SECRET_KEY.trim() &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.trim(),
  );
}
