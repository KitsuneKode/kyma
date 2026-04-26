import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Outfit, Lora, IBM_Plex_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { hasClerkServerCredentials } from '@/lib/clerk/config'
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

export const metadata: Metadata = {
  title: 'Kyma',
  description: 'Reliable realtime tutor screening.',
  metadataBase: new URL('https://kyma.kitsunelabs.xyz'),
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: ['/favicon.ico'],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Kyma',
    description: 'Reliable realtime tutor screening.',
    url: 'https://kyma.kitsunelabs.xyz',
    siteName: 'Kyma',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Kyma logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kyma',
    description: 'Reliable realtime tutor screening.',
    images: ['/og-image.png'],
  },
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
        <Providers clerkEnabled={clerkEnabled}>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  )

  if (!clerkEnabled) {
    return content
  }

  return <ClerkProvider>{content}</ClerkProvider>
}
