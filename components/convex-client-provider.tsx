"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import { ReactNode, useMemo } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

let convexClient: ConvexReactClient | null = null;

function getConvexClient() {
  if (!convexUrl) {
    return null;
  }

  convexClient ??= new ConvexReactClient(convexUrl);
  return convexClient;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => getConvexClient(), []);

  if (!client) {
    return <>{children}</>;
  }

  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
