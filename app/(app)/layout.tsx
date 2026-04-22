import Link from "next/link";
import type { ReactNode } from "react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

import { hasClerkServerCredentials } from "@/lib/clerk/config";

export default function AppLayout({ children }: { children: ReactNode }) {
  const clerkEnabled = hasClerkServerCredentials();

  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-4 text-sm">
            <Link className="font-semibold" href="/">
              Kyma
            </Link>
            <Link
              className="text-muted-foreground transition-colors hover:text-foreground"
              href="/admin"
            >
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
    </>
  );
}
