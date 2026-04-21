import Link from "next/link";

import { ConvexClientProvider } from "@/components/convex-client-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ReactNode } from "react";

export const Providers = ({
  children,
  clerkEnabled,
}: {
  children: ReactNode;
  clerkEnabled: boolean;
}) => {
  return (
    <ThemeProvider>
      <ConvexClientProvider clerkEnabled={clerkEnabled}>
        <header className="border-b">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
            <div className="flex items-center gap-4 text-sm">
              <Link className="font-semibold" href="/">
                Kyma
              </Link>
              <Link className="text-muted-foreground transition-colors hover:text-foreground" href="/admin">
                Admin
              </Link>
              <Link
                className="text-muted-foreground transition-colors hover:text-foreground"
                href="/interviews/demo-invite"
              >
                Candidate Flow
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {clerkEnabled ? (
                <>
                  <Show when="signed-out">
                    <SignInButton />
                    <SignUpButton />
                  </Show>
                  <Show when="signed-in">
                    <UserButton />
                  </Show>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Clerk disabled for local public-flow testing
                </span>
              )}
            </div>
          </div>
        </header>
        {children}
      </ConvexClientProvider>
    </ThemeProvider>
  );
};
