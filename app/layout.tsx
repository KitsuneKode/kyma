import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Outfit, Merriweather, JetBrains_Mono } from "next/font/google";
import { hasClerkCredentials } from "@/lib/clerk/config";
import { Providers } from "./providers";
import "./globals.css";

const fontSans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontSerif = Merriweather({
  subsets: ["latin"],
  variable: "--font-serif",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
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
  const content = (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );

  if (!hasClerkCredentials()) {
    return content;
  }

  return <ClerkProvider>{content}</ClerkProvider>;
}
