import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Outfit, Merriweather, JetBrains_Mono } from "next/font/google";
import { hasClerkServerCredentials } from "@/lib/clerk/config";
import { Providers } from "./providers";
import "@livekit/components-styles";
import "./globals.css";

const fontSans = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const fontSerif = Merriweather({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-serif",
  weight: ["400", "700"],
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Kyma",
  description: "Reliable realtime tutor screening.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkEnabled = hasClerkServerCredentials();
  const content = (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} font-sans antialiased`}
      >
        <Providers clerkEnabled={clerkEnabled}>{children}</Providers>
      </body>
    </html>
  );

  if (!clerkEnabled) {
    return content;
  }

  return <ClerkProvider>{content}</ClerkProvider>;
}
