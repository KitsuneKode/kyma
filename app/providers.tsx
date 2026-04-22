import { ConvexClientProvider } from "@/components/convex-client-provider";
import { ThemeProvider } from "@/components/theme-provider";
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
        {children}
      </ConvexClientProvider>
    </ThemeProvider>
  );
};
