import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/brand/site'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dev/',
          '/recruiter/',
          '/candidate/',
          '/admin/',
          '/auth/',
          '/onboarding/',
          '/join/',
          '/interviews/',
          '/i/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
