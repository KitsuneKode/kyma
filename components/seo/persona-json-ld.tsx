import { getSiteUrl } from '@/lib/brand/site'
import { personaPath, type PersonaPage } from '@/lib/seo/personas'

export function PersonaJsonLd({ persona }: { persona: PersonaPage }) {
  const siteUrl = getSiteUrl()
  const pageUrl = new URL(personaPath(persona.slug), siteUrl).toString()

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: persona.metaTitle,
    description: persona.metaDescription,
    url: pageUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Kyma',
      url: siteUrl,
    },
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Solutions',
        item: new URL('/for', siteUrl).toString(),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: persona.title,
        item: pageUrl,
      },
    ],
  }

  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: persona.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
    </>
  )
}
