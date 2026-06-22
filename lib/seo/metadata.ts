import type { Metadata } from 'next'
import { brand, getSiteUrl } from '@/lib/brand/site'

export function createSiteMetadata(overrides?: Metadata): Metadata {
  const siteUrl = getSiteUrl()

  const base: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
      default: brand.name,
      template: `%s · ${brand.name}`,
    },
    description: brand.description,
    applicationName: brand.name,
    keywords: [...brand.keywords],
    authors: [{ name: 'Kitsune Labs', url: siteUrl }],
    creator: 'Kitsune Labs',
    publisher: 'Kitsune Labs',
    category: 'education',
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: siteUrl,
      siteName: brand.name,
      title: brand.name,
      description: brand.shortDescription,
    },
    twitter: {
      card: 'summary_large_image',
      title: brand.name,
      description: brand.shortDescription,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
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
  }

  return {
    ...base,
    ...overrides,
    openGraph: {
      ...base.openGraph,
      ...overrides?.openGraph,
    },
    twitter: {
      ...base.twitter,
      ...overrides?.twitter,
    },
  }
}

export function createPageMetadata(input: {
  title: string
  description: string
  path: string
  noIndex?: boolean
}): Metadata {
  const siteUrl = getSiteUrl()
  const url = new URL(input.path, siteUrl).toString()

  return createSiteMetadata({
    title: input.title,
    description: input.description,
    alternates: {
      canonical: input.path,
    },
    openGraph: {
      title: `${input.title} · ${brand.name}`,
      description: input.description,
      url,
    },
    twitter: {
      title: `${input.title} · ${brand.name}`,
      description: input.description,
    },
    robots: input.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  })
}
