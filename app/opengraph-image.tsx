import {
  ogImageAlt,
  ogImageContentType,
  ogImageSize,
  renderOgImage,
} from '@/lib/brand/social-image'

export const alt = ogImageAlt
export const size = ogImageSize
export const contentType = ogImageContentType

export default function Image() {
  return renderOgImage()
}
