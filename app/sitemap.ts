import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/brand/site'
import { personaPages } from '@/lib/seo/personas'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()
  const lastModified = new Date()

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/for`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    ...personaPages.map((persona) => ({
      url: `${siteUrl}/for/${persona.slug}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    {
      url: `${siteUrl}/sign-in/candidate`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${siteUrl}/sign-in/recruiter`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ]
}
