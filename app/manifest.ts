import type { MetadataRoute } from 'next'
import { brand } from '@/lib/brand/site'
import { brandColors } from '@/lib/brand/colors'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name,
    description: brand.shortDescription,
    start_url: '/',
    display: 'standalone',
    background_color: brandColors.canvas,
    theme_color: brandColors.canvas,
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
