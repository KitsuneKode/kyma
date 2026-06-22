import { ImageResponse } from 'next/og'

import { OgImage } from '@/lib/brand/og-image'
import { getAllPersonaSlugs, getPersonaPage } from '@/lib/seo/personas'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type PersonaOgImageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllPersonaSlugs().map((slug) => ({ slug }))
}

export default async function Image({ params }: PersonaOgImageProps) {
  const { slug } = await params
  const persona = getPersonaPage(slug)

  if (!persona) {
    return new ImageResponse(<OgImage />, { ...size })
  }

  return new ImageResponse(
    <OgImage
      eyebrow={persona.eyebrow}
      title={persona.title}
      description={persona.metaDescription}
    />,
    { ...size }
  )
}
