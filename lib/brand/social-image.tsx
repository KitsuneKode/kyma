import { ImageResponse } from 'next/og'
import { OgImage } from './og-image'
import { brand } from './site'

export const ogImageAlt = `${brand.name} — ${brand.shortDescription}`
export const ogImageSize = { width: 1200, height: 630 }
export const ogImageContentType = 'image/png'

export function renderOgImage() {
  return new ImageResponse(<OgImage />, { ...ogImageSize })
}
