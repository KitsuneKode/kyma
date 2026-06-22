import 'server-only'

import { clientEnv } from '@/lib/env/client'
import { serverEnv } from '@/lib/env/server'

const DEFAULT_SITE_URL = 'https://kyma.kitsunelabs.xyz'

export function getSiteUrl(): string {
  const fromEnv =
    clientEnv.NEXT_PUBLIC_APP_URL?.trim() ||
    (serverEnv.VERCEL_URL
      ? `https://${serverEnv.VERCEL_URL.replace(/^https?:\/\//, '')}`
      : undefined)

  return fromEnv ?? DEFAULT_SITE_URL
}
