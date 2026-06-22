import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Outfit, Lora, IBM_Plex_Mono } from 'next/font/google'
import { Suspense } from 'react'
import { Toaster } from 'sonner'
import { kymaClerkAppearance } from '@/lib/clerk/appearance'
import { hasClerkServerCredentials } from '@/lib/clerk/config'
import { brandColors } from '@/lib/brand/colors'
import { createSiteMetadata } from '@/lib/seo/metadata'
import { Providers } from './providers'
import '@livekit/components-styles'
import './globals.css'

const fontSans = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

const fontSerif = Lora({
  subsets: ['latin'],
  display: 'swap',
  style: ['normal', 'italic'],
  variable: '--font-serif',
})

const fontMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600'],
  variable: '--font-mono',
})

export const metadata: Metadata = createSiteMetadata()

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e9e4d8' },
    { media: '(prefers-color-scheme: dark)', color: brandColors.canvas },
  ],
  colorScheme: 'dark light',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const clerkEnabled = hasClerkServerCredentials()
  const content = (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable} font-sans antialiased`}
      >
        <Suspense fallback={null}>
          <Providers clerkEnabled={clerkEnabled}>
            {children}
            <Toaster
              richColors
              position="top-right"
              toastOptions={{
                style: {
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  color: 'var(--card-foreground)',
                },
              }}
            />
          </Providers>
        </Suspense>
      </body>
    </html>
  )

  if (!clerkEnabled) {
    return content
  }

  return (
    <ClerkProvider appearance={kymaClerkAppearance}>{content}</ClerkProvider>
  )
}
