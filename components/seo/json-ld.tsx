import { brand, getSiteUrl } from '@/lib/brand/site'

export function MarketingJsonLd() {
  const siteUrl = getSiteUrl()

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.name,
    url: siteUrl,
    logo: `${siteUrl}/kyma-mark.png`,
    description: brand.description,
  }

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: brand.name,
    url: siteUrl,
    description: brand.shortDescription,
    publisher: {
      '@type': 'Organization',
      name: brand.name,
      url: siteUrl,
    },
  }

  const software = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: brand.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: siteUrl,
    description: brand.description,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }}
      />
    </>
  )
}
